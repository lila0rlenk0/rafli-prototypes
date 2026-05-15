import { MailCheck } from 'lucide-react';
import type { Metadata } from 'next';

import { SubscribeNavbar } from '@/components/subscribe/navbar';

/**
 * `/credits-pending` — landing the buyer hits IMMEDIATELY after Fanbasis
 * captures the charge, BEFORE the webhook fulfillment runs and BEFORE the
 * Better-Auth magic-link email arrives.
 *
 * End-to-end flow:
 * 1. Buyer submits email on `/subscribe`, gets redirected to Fanbasis hosted page.
 * 2. Buyer pays. Fanbasis redirects browser to this page (with `email`,
 *    `payment_id`, `product_name`, etc. echoed back as query params).
 * 3. In parallel: Fanbasis webhook fires `FulfillFanbasisPublicCreditCommand`
 *    on the backend, which either grants credits (existing user) or queues a
 *    pending grant (unknown email), then fires the magic-link send.
 * 4. Buyer reads the email, clicks the link → Better-Auth verifies, sets
 *    session, redirects to `/credits-claimed`.
 *
 * This page exists so step 2 has its own visible state. Earlier the Fanbasis
 * success redirect and the magic-link callback shared `/credits-claimed`,
 * which meant the post-payment landing always rendered "Magic link expired"
 * (no session yet) — actively misleading to a buyer who just paid.
 *
 * NOT auth-aware: even if the buyer happens to already have a session for a
 * DIFFERENT email, the new credits land on the email they entered at
 * checkout, so the "check your email" instruction is correct regardless of
 * current session state. Render-time `getSession()` is intentionally not
 * called.
 *
 * `noindex` because a crawler hitting this URL outside the funnel has no
 * email param and would render the generic copy, which has zero SEO value.
 */

const TITLE = 'Check your email';
const DESCRIPTION =
	'Your Rafli credits are queued — we just emailed you a one-click sign-in link to finish claiming them.';

export const metadata: Metadata = {
	title: TITLE,
	description: DESCRIPTION,
	robots: {
		index: false,
		follow: false,
		nocache: true,
	},
};

interface CreditsPendingPageProps {
	// Next.js 16 — searchParams resolves to a plain object after await.
	// `string | string[] | undefined` mirrors Next.js's inferred shape for
	// repeated keys; we collapse arrays to their first value below.
	readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// RFC 5321 mailbox length cap — same value the backend DTO enforces on
// `email`. Used here as a sanity bound before display so a malformed query
// string (e.g. someone hand-crafting a giant value) can't blow out the layout.
const MAX_EMAIL_LENGTH = 254;

// Deliberately minimal email shape check — we are NOT trying to validate
// deliverability, just confirming the value Fanbasis echoed back looks like
// `local@domain` so we don't render junk in the copy. The backend already
// did the real validation at create-checkout time; if Fanbasis ever returns
// something that doesn't match, we degrade to the generic message instead
// of showing it.
const EMAIL_SHAPE_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Pull a single string out of a `searchParams` entry that could be a plain
 * string, an array (repeated keys), or undefined. We always take the first
 * value — repeated `?email=a&email=b` is non-sensical here, but we shouldn't
 * crash on it.
 */
export function firstSearchParam(
	value: string | string[] | undefined,
): string | null {
	if (Array.isArray(value)) {
		return value[0] ?? null;
	}
	return value ?? null;
}

/**
 * Extract a displayable email from `searchParams.email`. Returns the
 * trimmed value only if it matches the basic shape AND fits the RFC 5321
 * cap; otherwise `null` so the caller renders generic copy. Exported for
 * unit-test coverage (the page itself is async and not trivially testable
 * with `bun:test`).
 */
export function parsePendingCreditEmail(
	value: string | string[] | undefined,
): string | null {
	const raw = firstSearchParam(value);
	if (raw === null) return null;
	const trimmed = raw.trim();
	if (trimmed.length === 0 || trimmed.length > MAX_EMAIL_LENGTH) return null;
	if (!EMAIL_SHAPE_REGEX.test(trimmed)) return null;
	return trimmed;
}

export default async function CreditsPendingPage({
	searchParams,
}: CreditsPendingPageProps) {
	const params = await searchParams;
	const email = parsePendingCreditEmail(params.email);

	return (
		// Mirror `/credits-claimed`'s shell so both post-payment surfaces feel
		// like the same flow — same navbar, same min-height math, same
		// overflow guard so any future full-bleed bleed doesn't spawn a
		// horizontal scroll container on mobile Safari.
		<main className="bg-background relative min-h-dvh overflow-x-clip">
			<SubscribeNavbar>
				<section className="flex min-h-(--spacing-page-dvh) flex-col items-center justify-center py-16">
					<PendingStateCard email={email} />
				</section>
			</SubscribeNavbar>
		</main>
	);
}

interface PendingStateCardProps {
	readonly email: string | null;
}

/**
 * "Check your email" card. The email is shown when we have a confidently
 * parsed value so the buyer can confirm they're looking at the right inbox
 * (and notice typos like `gmial.com` immediately). When we don't, the copy
 * falls back to a generic instruction — never "Check your email at
 * undefined", which would erode trust on a page they just paid to land on.
 */
function PendingStateCard({ email }: PendingStateCardProps) {
	return (
		<div className="border-ink-900 bg-brand-mint flex w-full max-w-xl flex-col items-center gap-5 rounded-3xl border px-8 py-12 text-center sm:px-12">
			<span className="bg-ink-900 text-on-dark flex size-14 items-center justify-center rounded-2xl">
				<MailCheck className="size-6" aria-hidden />
			</span>

			<h1 className="font-clash-display text-headline-lg text-ink-900 font-semibold">
				Check your email
			</h1>

			<p className="text-body-md text-ink-900 font-medium">Payment received.</p>

			<p className="text-body-md text-ink-alpha max-w-md font-medium">
				We just sent a one-click sign-in link to{' '}
				{email === null ? (
					'the email you entered at checkout'
				) : (
					// `break-all` keeps long localparts from blowing the card
					// out of its max-width on narrow viewports.
					<span className="text-ink-900 font-semibold break-all">{email}</span>
				)}
				. Click it to claim your $10 in Rafli credits.
			</p>

			<p className="text-body-sm text-ink-alpha max-w-md">
				The link can take a minute to arrive. If you don&apos;t see it, check
				your spam folder.
			</p>
		</div>
	);
}
