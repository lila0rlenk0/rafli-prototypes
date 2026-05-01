'use client';

import { Check, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

import { ManageSubscriptionButton } from '@/components/pricing/subscribe/manage-subscription-button';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/class-names';
import { useInvalidateMySubscription } from '@/services/subscription/use-my-subscription';
import type { MySubscription, SubscriptionPlan } from '@/types/subscription';

// Mobile-first cap on the benefits list — taller stacks push the dialog
// past the viewport on small screens. Plan can ship more features; only
// the first four advertise on this surface.
const MAX_DIALOG_BENEFITS = 4;

const EYEBROW_CLASS = 'text-label-sm text-foreground font-semibold uppercase';
const HEADLINE_CLASS =
	'font-clash-display text-headline-md sm:text-headline-lg text-foreground font-semibold';
const DESCRIPTION_CLASS = 'text-body-md text-foreground/80 font-medium';
const PRIMARY_CTA_CLASS = 'h-12 w-full font-semibold';

interface SubscriptionSuccessDialogProps {
	/** Server-fetched subscription. `null` when the Stripe webhook hasn't landed. */
	readonly subscription: MySubscription | null;
}

/**
 * Post-checkout dialog opened by `?status=success` in the URL.
 *
 * Two states: enrolled (subscription present) shows plan + benefits + CTA;
 * finalizing (subscription null) shows a refresh affordance for late
 * webhooks. The dialog scrubs `?status=success` on mount so a reload
 * doesn't re-open it.
 *
 * @returns Mint-surface dialog rendered when `?status=success` is set.
 */
export function SubscriptionSuccessDialog({
	subscription,
}: SubscriptionSuccessDialogProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const invalidateMySubscription = useInvalidateMySubscription();
	// Snapshot the URL once: `router.replace` below would otherwise flip
	// this to false mid-render and close the dialog before the user sees it.
	const [isOpen, setIsOpen] = useState(
		() => searchParams.get('status') === 'success',
	);
	const [isRefreshing, startRefreshTransition] = useTransition();

	// mount: scrub `?status=success` from the URL and invalidate the
	// subscription cache exactly once, when the dialog opens. Re-running on
	// `searchParams` identity change would otherwise loop on every navigation
	// inside the page (e.g. plan-card hover affordances that touch the URL).
	// Captured deps used inside the effect are referentially stable for the
	// lifetime of this dialog — `searchParams` is read at mount via the
	// `useState` initializer above, and `router`/`invalidateMySubscription`
	// are React-stable callables. Using a ref guard sidesteps the
	// exhaustive-deps lint while keeping the side effect single-shot.
	const didRunRef = useRef(false);
	useEffect(() => {
		if (didRunRef.current) return;
		if (searchParams.get('status') !== 'success') return;
		didRunRef.current = true;
		// Subscriber state changed server-side — invalidate the React Query
		// cache so the navbar tier badge and any other consumer refetch on
		// next read. `void` because the dialog UX doesn't depend on the
		// refetch resolving.
		void invalidateMySubscription();
		const next = new URLSearchParams(searchParams);
		next.delete('status');
		router.replace(next.size ? `/pricing?${next}` : '/pricing', {
			scroll: false,
		});
	}, [router, searchParams, invalidateMySubscription]);

	function handleRefresh() {
		// Transition folds back-to-back clicks into one pending refresh.
		startRefreshTransition(() => router.refresh());
	}

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			{/* `showCloseButton={false}` — the MEMBER sticker occupies the
			    top-right corner where Radix's default X lives; rendering both
			    overlaps the X with the rotated badge. Esc + overlay-click
			    close paths stay intact, and both bodies expose explicit CTAs
			    so the user is never trapped. `max-w-card-xs` (no `sm:`
			    prefix) — `sm:max-w-card-xs` lost the cascade to
			    `max-w-[calc(100%-2rem)]` at sm+, leaving the dialog ~viewport-
			    wide; the parent `max-sm:max-w-none` already handles the
			    mobile fullscreen case so a base-level cap is correct.
			    No `overflow-hidden` here: the MEMBER sticker now mirrors
			    the plan-card discount sticker's cantilever-off-the-edge
			    geometry, and clipping would shave the rotated corner. */}
			<DialogContent
				showCloseButton={false}
				className="bg-brand-mint max-w-card-xs border-brand-dark sm:rounded-3xl sm:border-2"
			>
				{subscription ? (
					<EnrolledBody plan={subscription.plan} />
				) : (
					<FinalizingBody
						onRefresh={handleRefresh}
						isRefreshing={isRefreshing}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

interface EnrolledBodyProps {
	readonly plan: SubscriptionPlan;
}

function EnrolledBody({ plan }: EnrolledBodyProps) {
	const { name, metadata } = plan;
	const features = metadata.features.slice(0, MAX_DIALOG_BENEFITS);

	return (
		<div className="relative flex flex-col gap-6 pt-2 sm:pt-4">
			<MemberSticker badgeText={metadata.badgeText} />

			<DialogHeader className="gap-3 text-left">
				<div className="inline-flex items-center gap-2">
					<Sparkles aria-hidden className="text-foreground size-5" />
					<span className={EYEBROW_CLASS}>Subscription confirmed</span>
				</div>
				<DialogTitle className={HEADLINE_CLASS}>You&rsquo;re in.</DialogTitle>
				<DialogDescription className={DESCRIPTION_CLASS}>
					Welcome to{' '}
					<span className="text-foreground font-semibold">{name}</span>. Your
					benefits are live starting now.
				</DialogDescription>
			</DialogHeader>

			<ul className="flex flex-col gap-3">
				{features.map(function renderFeature(feature) {
					return (
						<li key={feature.text} className="flex items-start gap-3">
							<span className="bg-brand-dark mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md">
								<Check
									aria-hidden
									className="size-3 text-white"
									strokeWidth={3.5}
								/>
							</span>
							<span className="text-body-sm text-foreground font-medium">
								{feature.text}
							</span>
						</li>
					);
				})}
			</ul>

			<div className="mt-2 flex flex-col gap-3">
				<Button asChild size="lg" className={PRIMARY_CTA_CLASS}>
					{/* /browse is the primary post-enrolment destination — the
					    discount applies platform-wide, so the fastest "use what
					    you just bought" path is the browse grid. */}
					<Link href="/browse">Start winning</Link>
				</Button>
				<ManageSubscriptionButton />
			</div>
		</div>
	);
}

interface MemberStickerProps {
	readonly badgeText: string | null;
}

/**
 * Rotated yellow sticker pinned to the dialog's top-right. Decorative —
 * the DialogTitle carries the announcement for assistive tech.
 *
 * Geometry mirrors `DiscountSticker` on the plan cards
 * (`-rotate-tilt-sm`, `-top-5 right-2 sm:-top-7 sm:right-4`,
 * `h-17.5 w-37.5 sm:h-21.25 sm:w-42.5`, `rounded-3xl`, 1px border) so
 * the success dialog visually inherits the same "stuck-on after the
 * fact" badge motif the rest of the pricing surface uses.
 */
function MemberSticker({ badgeText }: MemberStickerProps) {
	return (
		<span
			aria-hidden
			className="bg-brand-yellow -rotate-tilt-sm border-brand-dark pointer-events-none absolute -top-5 right-2 flex h-17.5 w-37.5 flex-col items-center justify-center rounded-3xl border sm:-top-7 sm:right-4 sm:h-21.25 sm:w-42.5"
		>
			<span className="font-clash-display text-foreground text-xl/none font-semibold sm:text-2xl">
				MEMBER
			</span>
			{badgeText ? (
				<span className="text-foreground mt-1 text-xs font-semibold sm:text-sm">
					{badgeText}
				</span>
			) : null}
		</span>
	);
}

interface FinalizingBodyProps {
	readonly onRefresh: () => void;
	readonly isRefreshing: boolean;
}

/**
 * Webhook-still-in-flight fallback. An explicit "Check status" beats a
 * silent spinner that never resolves on a genuinely failed webhook.
 */
function FinalizingBody({ onRefresh, isRefreshing }: FinalizingBodyProps) {
	return (
		<div className="flex flex-col gap-6 pt-2 sm:pt-4">
			<DialogHeader className="gap-3 text-left">
				<div className="inline-flex items-center gap-2">
					<Loader2
						aria-hidden
						className="text-foreground size-5 animate-spin"
					/>
					<span className={EYEBROW_CLASS}>Almost there</span>
				</div>
				<DialogTitle className={HEADLINE_CLASS}>
					Setting up your membership.
				</DialogTitle>
				<DialogDescription className={DESCRIPTION_CLASS}>
					Stripe is finalising your subscription. This usually takes under ten
					seconds — check again in a moment.
				</DialogDescription>
			</DialogHeader>

			<Button
				size="lg"
				onClick={onRefresh}
				disabled={isRefreshing}
				aria-busy={isRefreshing}
				className={cn('mt-2', PRIMARY_CTA_CLASS)}
			>
				{isRefreshing ? (
					<>
						<Loader2 className="animate-spin" aria-hidden />
						<span>Checking…</span>
					</>
				) : (
					'Check status'
				)}
			</Button>
		</div>
	);
}
