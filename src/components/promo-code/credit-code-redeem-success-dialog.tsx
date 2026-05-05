'use client';

import { PartyPopper } from 'lucide-react';
import Link from 'next/link';

import { RedemptionDecor } from '@/components/promo-code/redemption-decor';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils/format/format-currency';
import { isEarnmaxPromoCode } from '@/types/promo-code';

// Typography snapshot shared with `CancelSubscriptionDialog` so both
// celebratory + loss-framed dialogs read with the same H2-Desktop /
// body-sm rhythm. The `--text-headline-lg--letter-spacing` token already
// encodes the Clash Display tracking — no inline override needed here.
const HEADLINE_CLASS =
	'font-clash-display text-headline-lg text-foreground font-semibold';
const DESCRIPTION_CLASS = 'text-body-sm text-foreground';
// Pill CTAs use the Figma `w-64 h-12` (16rem × 3rem) silhouette. Width
// is fixed (not `w-full`) so both buttons stay centred and visually
// balanced when they stack — matching the Figma layout where each pill
// sits centre-aligned regardless of viewport width.
const CTA_CLASS = 'h-12 w-64 rounded-full px-6 font-semibold';
// Destinations exposed on the success surface. `/browse` is the public
// sweepstakes index; `/profile/credits` is the authenticated balance
// page. Hard-coded literals (not a route helper) because these two
// destinations are unique to this dialog — no other surface needs to
// share the constants, so a helper would be premature abstraction.
const BROWSE_HREF = '/browse';
const CREDITS_HREF = '/profile/credits';

interface CreditCodeRedeemSuccessDialogProps {
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
	/**
	 * The exact code the user typed (canonical XXXX-XXXX). Used only to
	 * detect the Earnmax-tier prefix — the BE doesn't echo a tier on the
	 * redeem response so we infer from the code itself.
	 */
	readonly code: string;
	/** Decimal string from the redeem response — e.g. `"5.0000"`. */
	readonly creditsGranted: string;
	/** Decimal string from the redeem response — e.g. `"42.5000"`. */
	readonly balanceAfter: string;
}

/**
 * Success acknowledgement shown after `useRedeemCreditCode` resolves.
 *
 * Layout follows Figma frame `2200-4288`:
 * - white card with hairline border (default `<DialogContent>` border)
 * - three-layer rotated card cluster (sky / mint / yellow) bleeding
 *   from the top-left and top-right corners — see `RedemptionDecor`
 * - 96-px party-popper glyph sitting above the headline
 * - two pill CTAs that route the user toward the next obvious step:
 *   spending the credits (`/browse`) or auditing the balance
 *   (`/profile/credits`)
 *
 * Pixel-precise Figma values (`w-[760px]`, `left-[766.99px]`, etc.) are
 * approximated with the closest theme tokens because `local/no-arbitrary-
 * classname` (see `eslint-rules/`) blocks one-off arbitrary utilities in
 * product code — the visual silhouette is preserved while the class list
 * stays token-driven and DESIGN.md-compliant. The corner-card geometry
 * stays pixel-true via SVG `<rect transform>` inside `RedemptionDecor`,
 * where attribute literals are not subject to the lint rule.
 *
 * Two copy variants driven by the code prefix:
 * - **Earnmax** (`MAX-XXXXXXXX-XXXXXX`) — onboarding framing. These codes
 *   are minted by the Earnmax migration job (`EARNMAX_MIGRATION.csv` in
 *   the backend repo) and the success surface is the user's first
 *   touchpoint with the brand, so the language acknowledges the
 *   programme by name and leans into the perk-unlock vibe.
 * - **Generic** — neutral "code redeemed" copy used for every other
 *   credit-grant code (campaign codes, support comps, etc.).
 *
 * Both CTAs close the dialog on click — `next/link` triggers an in-flight
 * client navigation that unmounts the dialog naturally on route change,
 * but the explicit `onClick={handleClose}` covers the edge case where the
 * user is already on the destination route (in which case Next's router
 * would no-op and the dialog would otherwise stay open).
 *
 * @returns Dialog confirming the redemption with copy keyed off code prefix.
 */
export function CreditCodeRedeemSuccessDialog({
	open,
	onOpenChange,
	code,
	creditsGranted,
	balanceAfter,
}: CreditCodeRedeemSuccessDialogProps) {
	// Inferred at render rather than threaded through props so the parent
	// doesn't have to mirror the prefix-detection logic — keeps the dialog
	// the single source of truth for which copy variant is correct.
	const isEarnmax = isEarnmaxPromoCode(code);
	const formattedAmount = formatCurrency(creditsGranted, 'USD');
	const formattedBalance = formatCurrency(balanceAfter, 'USD');

	function handleClose() {
		onOpenChange(false);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="border-brand-dark max-w-3xl overflow-hidden bg-white sm:rounded-3xl sm:border-2">
				{/*
				 * `relative` anchors the absolutely-positioned decor SVG to
				 * the body. `pt-24` reserves vertical room for the 96-px icon
				 * to sit clear of the decor's top band — without the offset
				 * the icon would land inside the yellow card cluster on
				 * smaller viewports.
				 */}
				<div className="relative flex flex-col items-center gap-10 p-2 pt-24 text-center sm:px-4">
					<RedemptionDecor />
					<PartyPopper
						aria-hidden
						className="text-foreground relative size-24"
						strokeWidth={2}
					/>
					<DialogHeader className="gap-4 text-center sm:text-center">
						<DialogTitle className={HEADLINE_CLASS}>
							{isEarnmax ? (
								<>
									Credits claimed!
									<br />
									Welcome aboard!
								</>
							) : (
								'Code redeemed!'
							)}
						</DialogTitle>
						<DialogDescription className={DESCRIPTION_CLASS}>
							{isEarnmax ? (
								<>
									Your EARNMax subscription unlocked{' '}
									<span className="font-semibold">{formattedAmount}</span> in
									credits.
									<br />
									Step up to the next level of prize pools and sweepstakes.
								</>
							) : (
								<>
									We&rsquo;ve added{' '}
									<span className="font-semibold">{formattedAmount}</span> in
									credits to your balance. Your new balance is{' '}
									<span className="font-semibold">{formattedBalance}</span>.
								</>
							)}
						</DialogDescription>
					</DialogHeader>
					<div className="flex w-full flex-col items-center gap-4">
						<Button
							asChild
							size="lg"
							className={CTA_CLASS}
							onClick={handleClose}
						>
							<Link href={BROWSE_HREF}>Browse sweepstakes</Link>
						</Button>
						<Button
							asChild
							size="lg"
							variant="outline"
							className={CTA_CLASS}
							onClick={handleClose}
						>
							<Link href={CREDITS_HREF}>View my credits</Link>
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
