import { formatCurrency } from '@/lib/utils/format/format-currency';

interface BuildPrimaryCtaLabelParams {
	isCheckoutLoading: boolean;
	isFreeTicketsPromo: boolean;
	total: number;
	currency: string;
}

/**
 * Builds the primary CTA label shared by the desktop `BuyButton` and the
 * mobile `StickyBuyTicketsCta`. Centralising the copy keeps the two surfaces
 * in lockstep — divergent strings here are the most common cause of "the
 * card says X but the sticky says Y" QA bugs.
 *
 * Free-tickets promos use the canonical AMOE copy; paid card checkout uses
 * the canonical one-time purchase label. Pricing renders inside the action
 * text so every payment method reads as a tender choice.
 *
 * @returns Primary CTA label string, ready to render verbatim.
 */
export function buildPrimaryCtaLabel({
	isCheckoutLoading,
	isFreeTicketsPromo,
	total,
	currency,
}: BuildPrimaryCtaLabelParams): string {
	if (isCheckoutLoading) return 'Processing...';
	if (isFreeTicketsPromo) return 'AMOE - Free Entries';
	return `One Time Purchase with Card ${formatCurrency(total, currency)}`;
}
