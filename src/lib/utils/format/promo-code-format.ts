import {
	PROMO_CODE_STATUS,
	PROMO_CODE_TYPE,
	type PromoCode,
	type PromoCodeStatus,
	type RaffleScopedPromoCodeType,
	type ValidatedPromoCode,
} from '@/types/promo-code';

import { formatCurrency } from './format-currency';

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

/** Promo `value` is `string` on the wire — render `—` for malformed payloads. */
const MALFORMED_PROMO_VALUE = '—';

/**
 * Per-type formatter table. Each entry takes the parsed numeric value and
 * returns the surface copy. Keeping host (table) and participant (caption)
 * variants as two formatter maps removes the duplicated parse + NaN guard +
 * exhaustive switch from both call sites.
 */
type PromoCodeFormatters = {
	readonly [T in RaffleScopedPromoCodeType]: (numericValue: number) => string;
};

function formatPromoValueWith(
	rawString: string,
	type: PromoCode['type'],
	formatters: PromoCodeFormatters,
): string {
	const value = parseFloat(rawString);
	if (!Number.isFinite(value)) return MALFORMED_PROMO_VALUE;
	return formatters[type](value);
}

const HOST_FORMATTERS: PromoCodeFormatters = {
	[PROMO_CODE_TYPE.FREE_TICKETS]: function freeTicketsHost(value) {
		const count = Math.floor(value);
		return `${count} entr${count === 1 ? 'y' : 'ies'}`;
	},
	[PROMO_CODE_TYPE.DISCOUNT_FIXED]: function fixedHost(value) {
		return formatCurrency(value, 'USD');
	},
	[PROMO_CODE_TYPE.DISCOUNT_PERCENT]: function percentHost(value) {
		return `${Math.floor(value)}%`;
	},
};

const PARTICIPANT_FORMATTERS: PromoCodeFormatters = {
	// Legal framing: "bonus entries" rather than "free tickets" so grants read as
	// bundled entries included with the Access Pass.
	[PROMO_CODE_TYPE.FREE_TICKETS]: function freeTicketsParticipant(value) {
		const count = Math.floor(value);
		return `${count} bonus entr${count === 1 ? 'y' : 'ies'}`;
	},
	// Fixed discounts apply once across the order — frame as "off your order".
	[PROMO_CODE_TYPE.DISCOUNT_FIXED]: function fixedParticipant(value) {
		return `${formatCurrency(value, 'USD')} off your order`;
	},
	// Percent promos apply per entry against the subscriber-effective unit.
	[PROMO_CODE_TYPE.DISCOUNT_PERCENT]: function percentParticipant(value) {
		return `${Math.floor(value)}% off per entry`;
	},
};

/** Formats promo code value for display in the host-side promo table. */
export function formatPromoCodeValue(code: PromoCode): string {
	return formatPromoValueWith(code.value, code.type, HOST_FORMATTERS);
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
 *
 * `rawValue` drives the percent / fixed amount display so the copy reflects
 * what the host configured (e.g. "10% off per entry"), not the per-ticket
 * dollar preview that depends on the user's effective unit price.
 */
export function getPromoCodeDescription(promo: ValidatedPromoCode): string {
	return formatPromoValueWith(
		promo.rawValue,
		promo.type,
		PARTICIPANT_FORMATTERS,
	);
}
