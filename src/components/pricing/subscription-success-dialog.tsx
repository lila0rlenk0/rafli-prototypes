'use client';

// Client boundary: reads `?status=success`, drives a controlled Dialog,
// scrubs the URL on close, and triggers a server-side refresh when the
// user wants to re-check against a late-landing Stripe webhook.

import { Check, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import type { MySubscription } from '@/types/subscription';

interface SubscriptionSuccessDialogProps {
	/**
	 * Server-fetched subscription from the page-level `getMySubscription()`.
	 * `null` means either the user has no subscription (dialog never shows)
	 * or the Stripe webhook hasn't landed yet (dialog shows a "finalizing"
	 * state that the user can refresh).
	 */
	readonly subscription: MySubscription | null;
}

/**
 * Post-checkout dialog shown when Stripe bounces the user back to
 * `/pricing?status=success`. Replaces the earlier toast — a toast on the
 * pricing grid felt like nothing happened after a paid commitment.
 *
 * Two states:
 *   1. **Enrolled** — `subscription` is present and matches the user's
 *      current plan. Shows the plan name, a benefits checklist derived
 *      from the plan's feature list, and the "Start winning" CTA.
 *   2. **Finalizing** — `subscription` is still `null` because the Stripe
 *      webhook is in flight. Shows a short waiting state with a "Check
 *      status" action that `router.refresh()`es the server tree. No
 *      auto-poll: webhook lag is measured in hundreds of milliseconds and
 *      an explicit action is clearer than a silent spinner that never
 *      resolves if the webhook genuinely failed.
 *
 * Query-param handling mirrors `SubscriptionCancelToast` — the param is
 * scrubbed on mount via `router.replace({ scroll: false })` so a reload
 * doesn't re-trigger the dialog. A `useRef` guard protects against React
 * StrictMode double-mount firing the replace twice.
 */
export function SubscriptionSuccessDialog({
	subscription,
}: SubscriptionSuccessDialogProps) {
	const searchParams = useSearchParams();
	const router = useRouter();

	// Deliberately snapshot the initial query param on mount. If we kept
	// reading live, `router.replace` (below) would flip `isSuccessFlow` to
	// `false` on the very next render and close the dialog before the user
	// could see it. The intent here is "did the user arrive with ?status=
	// success?" — a one-time read, not a reactive subscription.
	const [isSuccessFlow] = useState(
		() => searchParams.get('status') === 'success',
	);

	// Controlled open state — defaults to `true` when the user landed on
	// the success URL. Closing the dialog sets it to `false`, no way back.
	const [isOpen, setIsOpen] = useState(isSuccessFlow);

	// Guard against StrictMode double-mount firing `router.replace` twice
	// (dev-only: effects run → clean → run again before the URL flush
	// settles). A ref, not state, because we never want a render from it.
	const hasStrippedParamRef = useRef(false);

	// Pending flag for the "Check status" affordance in the finalizing body.
	// Without it, repeated clicks each fire an independent `router.refresh()`
	// with zero visual feedback; the button becomes a DoS on our own RSC tree.
	const [isRefreshing, startRefreshTransition] = useTransition();

	// Step 1 (mount-only): scrub the `status` param once we've committed
	// to rendering the dialog. The cleanup side of this effect isn't used
	// — stripping is idempotent once done. Route change on unmount is
	// already handled by the router.
	useEffect(() => {
		if (!isSuccessFlow) return;
		if (hasStrippedParamRef.current) return;
		hasStrippedParamRef.current = true;

		// mount: rebuild the query string without `status` so a reload
		// doesn't re-open the dialog. Preserves any unrelated params
		// (analytics, etc.) that happen to be present.
		const next = new URLSearchParams(searchParams.toString());
		next.delete('status');
		const queryString = next.toString();
		router.replace(queryString ? `/pricing?${queryString}` : '/pricing', {
			scroll: false,
		});
	}, [isSuccessFlow, router, searchParams]);

	// Stable handlers — `useCallback` keeps Dialog from treeing onOpenChange
	// as a new prop each render, which in turn lets Radix skip the internal
	// state-reconciliation step on unrelated renders.
	const handleOpenChange = useCallback(function onDialogOpenChange(
		next: boolean,
	) {
		setIsOpen(next);
	}, []);

	const handleRefresh = useCallback(
		function onRefreshClick() {
			// Wrapped in a transition so the button's disabled/spinner state
			// mirrors the in-flight RSC re-render; back-to-back clicks fold
			// into a single pending transition instead of stacking refreshes.
			// router.refresh() re-runs the RSC tree, which re-calls
			// getMySubscription() on the page and flows a populated
			// subscription back into this component's props. We don't close
			// the dialog — the user explicitly asked to re-check, so keep
			// the affordance open until they see the result or dismiss it.
			startRefreshTransition(() => {
				router.refresh();
			});
		},
		[router],
	);

	// Business rule: nothing to render for guests or the cancel / no-status
	// path. Returning null BEFORE the Dialog keeps Radix from mounting
	// portal DOM for a dialog that will never open.
	if (!isSuccessFlow) return null;

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogContent
				// Design: mint surface echoes the "you're in" success
				// affordance; the yellow rotated sticker ties the dialog to
				// the rest of the pricing page's visual language (discount
				// stickers on the plan cards). `overflow-hidden` clips the
				// sticker's overshoot on the right edge without needing
				// absolute offsets on the sticker itself.
				className="bg-accent-green overflow-hidden border-black sm:max-w-[480px] sm:rounded-3xl sm:border-2"
			>
				{subscription ? (
					<EnrolledDialogBody
						planName={subscription.plan.name}
						badgeText={subscription.plan.metadata.badgeText}
						benefits={subscription.plan.metadata.features}
					/>
				) : (
					<FinalizingDialogBody
						onRefresh={handleRefresh}
						isRefreshing={isRefreshing}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

interface EnrolledDialogBodyProps {
	readonly planName: string;
	readonly badgeText: string | null;
	readonly benefits: readonly { text: string; tag: string | null }[];
}

/**
 * Filled "you're enrolled" dialog body. Hoisted out of the parent so the
 * finalizing branch doesn't mount it (and vice versa) — each body is its
 * own component tree with its own lifecycle, which is cheaper than a
 * prop-driven branch inside a single tree.
 */
function EnrolledDialogBody({
	planName,
	badgeText,
	benefits,
}: EnrolledDialogBodyProps) {
	return (
		<div className="relative flex flex-col gap-6 pt-2 sm:pt-4">
			{/* Rotated yellow "MEMBER" sticker — mirrors the "X% OFF" sticker
			    motif on the plan cards so the dialog reads as part of the
			    same surface, not a generic modal. `aria-hidden` because the
			    sticker is decorative — the DialogTitle below carries the
			    real announcement for assistive tech. */}
			<span
				aria-hidden
				className="bg-accent-yellow pointer-events-none absolute -top-3 -right-2 flex h-[60px] w-[120px] -rotate-[12deg] flex-col items-center justify-center rounded-2xl border-2 border-black sm:-top-4 sm:-right-4 sm:h-[70px] sm:w-[140px]"
			>
				<span className="font-clash-display text-xl leading-none font-semibold text-black">
					MEMBER
				</span>
				{badgeText ? (
					<span className="mt-1 text-[11px] font-semibold text-black">
						{badgeText}
					</span>
				) : null}
			</span>

			<DialogHeader className="gap-3 text-left">
				<div className="inline-flex items-center gap-2">
					{/* Decorative sparkle — subtle, mint-tinted, sits before the
					    headline. Signals celebration without shouting. */}
					<Sparkles aria-hidden className="size-5 text-black" />
					<span className="text-xs font-semibold tracking-[0.24px] text-black uppercase">
						Subscription confirmed
					</span>
				</div>
				<DialogTitle
					// Headline uses the display face at a size that matches
					// the /pricing hero — keeps the dialog and the page
					// feeling authored by the same hand.
					className="font-clash-display text-3xl leading-[1.05] font-semibold tracking-[0.24px] text-black sm:text-[40px]"
				>
					You&rsquo;re in.
				</DialogTitle>
				<DialogDescription className="text-base font-medium text-black/80">
					Welcome to{' '}
					<span className="font-semibold text-black">{planName}</span>. Your
					benefits are live starting now.
				</DialogDescription>
			</DialogHeader>

			{/* Benefits list — same visual language as the plan card features
			    (neutral square + check glyph) so users recognise the contract
			    they just agreed to. Limited to four items to keep the dialog
			    vertically small on mobile. */}
			<ul className="flex flex-col gap-3">
				{benefits.slice(0, 4).map(function renderBenefit(benefit) {
					return (
						<li key={benefit.text} className="flex items-start gap-3">
							<span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-black">
								<Check
									aria-hidden
									className="size-3 text-white"
									strokeWidth={3.5}
								/>
							</span>
							<span className="text-sm font-medium text-black">
								{benefit.text}
							</span>
						</li>
					);
				})}
			</ul>

			<div className="mt-2 flex flex-col gap-3">
				<Button
					asChild
					size="lg"
					className="h-12 w-full bg-black font-semibold text-white hover:bg-black/90"
				>
					{/* /browse is the primary post-enrolment destination — the
					    user's discount applies platform-wide, so the fastest
					    "use what you just bought" path is the browse grid. */}
					<Link href="/browse">Start winning</Link>
				</Button>
				<Link
					href="/profile"
					className="focus-visible:ring-ring/50 mx-auto rounded-sm text-sm font-medium text-black underline underline-offset-4 hover:no-underline focus-visible:ring-[3px] focus-visible:outline-none"
				>
					Manage subscription
				</Link>
			</div>
		</div>
	);
}

interface FinalizingDialogBodyProps {
	readonly onRefresh: () => void;
	/** `true` while `router.refresh()` is resolving — disables the CTA and shows a spinner. */
	readonly isRefreshing: boolean;
}

/**
 * "Webhook still in flight" fallback. Shown when the user returns from
 * Stripe before the backend has marked the subscription active. Rare, but
 * the edge case matters — leaving the user with a silent toast and no
 * affordance to recover is the worst failure mode for a paid flow.
 */
function FinalizingDialogBody({
	onRefresh,
	isRefreshing,
}: FinalizingDialogBodyProps) {
	return (
		<div className="flex flex-col gap-6 pt-2 sm:pt-4">
			<DialogHeader className="gap-3 text-left">
				<div className="inline-flex items-center gap-2">
					<Loader2 aria-hidden className="size-5 animate-spin text-black" />
					<span className="text-xs font-semibold tracking-[0.24px] text-black uppercase">
						Almost there
					</span>
				</div>
				<DialogTitle className="font-clash-display text-3xl leading-[1.05] font-semibold tracking-[0.24px] text-black sm:text-[40px]">
					Setting up your membership.
				</DialogTitle>
				<DialogDescription className="text-base font-medium text-black/80">
					Stripe is finalising your subscription. This usually takes under ten
					seconds — check again in a moment.
				</DialogDescription>
			</DialogHeader>

			<div className="mt-2 flex flex-col gap-3">
				<Button
					type="button"
					size="lg"
					onClick={onRefresh}
					disabled={isRefreshing}
					aria-busy={isRefreshing}
					className="h-12 w-full bg-black font-semibold text-white hover:bg-black/90"
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
		</div>
	);
}
