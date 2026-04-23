import { DollarSign, Percent, Ticket } from 'lucide-react';

import { PROMO_CODE_TYPE, type PromoCode } from '@/types/promo-code';

/**
 * Formats expiration date for display.
 * Returns "Never" when the code has no expiration, matching the
 * "Never expires" copy shown in the mobile variant.
 * @returns localized short date or the literal "Never"
 */
export function formatExpiration(expiresAt: string | null): string {
	if (!expiresAt) return 'Never';

	return new Date(expiresAt).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
}

/**
 * Renders the icon associated with a promo code type.
 * Exhaustive over PROMO_CODE_TYPE — unknown types render nothing so new
 * backend values never crash the table while the frontend catches up.
 * @returns icon element or null
 */
export function TypeIcon({ type }: { type: PromoCode['type'] }) {
	switch (type) {
		case PROMO_CODE_TYPE.FREE_TICKETS:
			return <Ticket className="size-4 text-blue-600" />;
		case PROMO_CODE_TYPE.DISCOUNT_FIXED:
			return <DollarSign className="size-4 text-green-600" />;
		case PROMO_CODE_TYPE.DISCOUNT_PERCENT:
			return <Percent className="size-4 text-purple-600" />;
		default:
			return null;
	}
}

/**
 * Returns human-readable label for a promo code type.
 * Falls back to the raw type string so unknown backend values still
 * render something recognizable instead of "undefined".
 * @returns user-facing label
 */
export function getTypeLabel(type: PromoCode['type']): string {
	switch (type) {
		case PROMO_CODE_TYPE.FREE_TICKETS:
			return 'Free';
		case PROMO_CODE_TYPE.DISCOUNT_FIXED:
			return 'Fixed';
		case PROMO_CODE_TYPE.DISCOUNT_PERCENT:
			return 'Percent';
		default:
			return type;
	}
}
