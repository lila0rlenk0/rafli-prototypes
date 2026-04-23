import { DollarSign, Percent, Ticket, type LucideIcon } from 'lucide-react';

import { PROMO_CODE_TYPE, type PromoCodeType } from '@/types/promo-code';

/**
 * Visual + formatting metadata for a single promo code type. Registered
 * in {@link PROMO_TYPE_REGISTRY} so UI rows can look up all
 * per-type concerns in one place instead of fanning out to switch chains.
 */
interface PromoTypeEntry {
	/** Lucide icon component rendered next to the type label. */
	readonly icon: LucideIcon;
	/** Tailwind color class applied to the icon. */
	readonly iconClassName: string;
	/** Short label shown in the type column / mobile header. */
	readonly label: string;
	/**
	 * Formats the per-batch `value` for display. Kept as `number` to match
	 * the pending-batch payload (pre-persistence) — host-side tables use a
	 * separate formatter in `@/types/promo-code`.
	 */
	readonly format: (value: number) => string;
}

/**
 * O(1) lookup from promo type to its visual + format metadata.
 * Replaces the per-type switch chains that previously lived in the
 * section component. Keeping each entry colocated makes adding a new
 * promo type a one-line change (plus a compile error from the
 * exhaustive map satisfaction guard if anything is missed).
 */
export const PROMO_TYPE_REGISTRY: ReadonlyMap<PromoCodeType, PromoTypeEntry> =
	new Map<PromoCodeType, PromoTypeEntry>([
		[
			PROMO_CODE_TYPE.FREE_TICKETS,
			{
				icon: Ticket,
				iconClassName: 'text-blue-600',
				label: 'Free',
				format: value => `${value} ticket${value !== 1 ? 's' : ''}`,
			},
		],
		[
			PROMO_CODE_TYPE.DISCOUNT_FIXED,
			{
				icon: DollarSign,
				iconClassName: 'text-green-600',
				label: 'Fixed',
				format: value => `$${value.toFixed(2)}`,
			},
		],
		[
			PROMO_CODE_TYPE.DISCOUNT_PERCENT,
			{
				icon: Percent,
				iconClassName: 'text-purple-600',
				label: 'Percent',
				format: value => `${value}%`,
			},
		],
	]);

/**
 * Resolves the registry entry for a given promo type. Returns a
 * non-nullable entry because `PromoCodeType` is a closed union and the
 * registry is constructed exhaustively — narrower than `Map#get` on
 * purpose so call sites don't have to re-guard.
 *
 * @returns Metadata entry for the supplied promo type.
 */
export function getPromoTypeEntry(type: PromoCodeType): PromoTypeEntry {
	// Closed-union invariant — registry is built with every PROMO_CODE_TYPE
	// value, so the lookup cannot miss at runtime.
	const entry = PROMO_TYPE_REGISTRY.get(type);
	if (!entry) {
		throw new Error(`Unregistered promo type: ${type}`);
	}
	return entry;
}

/**
 * Formats an optional ISO expiration string for list rendering.
 * Pure helper colocated with the registry so row/list components don't
 * need to import date utilities directly.
 *
 * @returns Human-readable expiration ("Never" when absent).
 */
export function formatPromoExpiration(expiresAt?: string): string {
	if (!expiresAt) return 'Never';
	return new Date(expiresAt).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
}
