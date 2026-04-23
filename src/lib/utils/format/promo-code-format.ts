import {
	PROMO_CODE_STATUS,
	PROMO_CODE_TYPE,
	type PromoCode,
	type PromoCodeStatus,
	type ValidatedPromoCode,
} from '@/types/promo-code';

/**
 * Derives display status from promo code data.
 * Backend stores isActive flag, but display status depends on expiry and usage.
 */
export function getPromoCodeStatus(code: PromoCode): PromoCodeStatus {
	if (!code.isActive) {
		return PROMO_CODE_STATUS.INACTIVE;
	}
	if (code.expiresAt && new Date(code.expiresAt) < new Date()) {
		return PROMO_CODE_STATUS.EXPIRED;
	}
	if (code.maxUses > 0 && code.usedCount >= code.maxUses) {
		return PROMO_CODE_STATUS.EXHAUSTED;
	}
	return PROMO_CODE_STATUS.ACTIVE;
}

/** Formats promo code value for display in the host-side promo table. */
export function formatPromoCodeValue(code: PromoCode): string {
	const value = parseFloat(code.value);
	switch (code.type) {
		case PROMO_CODE_TYPE.FREE_TICKETS: {
			const count = Math.floor(value);
			return `${count} entr${count === 1 ? 'y' : 'ies'}`;
		}
		case PROMO_CODE_TYPE.DISCOUNT_FIXED:
			return `$${value.toFixed(2)}`;
		case PROMO_CODE_TYPE.DISCOUNT_PERCENT:
			return `${Math.floor(value)}%`;
		default: {
			const _exhaustive: never = code.type;
			return String(_exhaustive);
		}
	}
}

export function formatPromoCodeUsage(code: PromoCode): string {
	const maxDisplay = code.maxUses === 0 ? '∞' : code.maxUses.toString();
	return `${code.usedCount}/${maxDisplay}`;
}

export function formatUsageLimit(limit: number): string {
	return limit === 0 ? '∞' : String(limit);
}

/**
 * Human-readable copy for a validated participant promo (legal framing:
 * "bonus entries" not standalone tickets).
 */
export function getPromoCodeDescription(promo: ValidatedPromoCode): string {
	const value = parseFloat(promo.value);
	switch (promo.type) {
		case PROMO_CODE_TYPE.FREE_TICKETS: {
			const count = Math.floor(value);
			return `${count} bonus entr${count === 1 ? 'y' : 'ies'}`;
		}
		case PROMO_CODE_TYPE.DISCOUNT_FIXED:
			return `$${value.toFixed(2)} off your order`;
		case PROMO_CODE_TYPE.DISCOUNT_PERCENT:
			return `$${value.toFixed(2)} off per entry`;
		default: {
			const _exhaustive: never = promo.type;
			return String(_exhaustive);
		}
	}
}
