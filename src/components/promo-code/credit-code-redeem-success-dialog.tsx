'use client';

import { PartyPopper } from 'lucide-react';

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

// Typography snapshot lifted from `CancelSubscriptionDialog` so both
// celebratory + loss-framed dialogs share the same H2-Desktop / body-sm
// rhythm. The `--text-headline-lg--letter-spacing` token already encodes
// the Clash Display tracking, so no inline override is needed here.
const HEADLINE_CLASS =
	'font-clash-display text-headline-lg text-foreground font-semibold';
const DESCRIPTION_CLASS = 'text-body-sm text-foreground';
const PRIMARY_CTA_CLASS = 'h-12 rounded-full px-6 font-semibold';

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
 * Two copy variants driven by the code's prefix:
 * - **Earnmax** (`MAX-XXXXXXXX-XXXXXX`) — welcome framing. These codes are
 *   minted by the Earnmax migration job (see `EARNMAX_MIGRATION.csv` in the
 *   backend repo) and the success surface is the user's first touchpoint
 *   with the brand, so the language acknowledges the programme by name and
 *   leans into the perk-unlock vibe.
 * - **Generic** — neutral "code redeemed" copy used for every other
 *   credit-grant code (campaign codes, support comps, etc.).
 *
 * Why a modal (and not the previous toast):
 * Granting credits is a celebratory moment that warrants a focused
 * confirmation surface — a toast disappears in 4s and buries the new
 * balance in a tiny description line. The modal also gives Earnmax codes
 * room to introduce the programme on first redeem.
 *
 * Decor + layout mirror `CancelSubscriptionDialog` so the two surfaces
 * read as members of the same family — see `RedemptionDecor` for the
 * palette swap rationale.
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

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="border-brand-dark max-w-card-md overflow-hidden bg-white sm:rounded-3xl sm:border-2">
				{/*
				 * `relative` anchors the absolutely-positioned decor SVG to
				 * the body. `pt-32` reserves vertical room for the icon to
				 * sit clear of the decor's top band — without the offset
				 * the PartyPopper would land inside the colored card cluster
				 * on smaller viewports.
				 */}
				<div className="relative flex flex-col items-center gap-10 p-2 pt-32 text-center sm:px-4">
					<RedemptionDecor />
					<PartyPopper
						aria-hidden
						className="text-foreground relative size-28"
						strokeWidth={2}
					/>
					<DialogHeader className="gap-4 text-center sm:text-center">
						<DialogTitle className={HEADLINE_CLASS}>
							{isEarnmax ? 'Welcome to Earnmax!' : 'Code redeemed!'}
						</DialogTitle>
						<DialogDescription className={DESCRIPTION_CLASS}>
							{isEarnmax ? (
								<>
									Your Earnmax code unlocked{' '}
									<span className="font-semibold">{formattedAmount}</span> in
									credits plus access to Earnmax-only perks. Your new balance is{' '}
									<span className="font-semibold">{formattedBalance}</span>.
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
					<Button
						size="lg"
						className={PRIMARY_CTA_CLASS}
						onClick={() => onOpenChange(false)}
					>
						Done
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
