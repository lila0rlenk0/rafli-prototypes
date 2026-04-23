'use client';

import { PromoCodeInput } from '@/components/promo-code/input';
import type { ValidatedPromoCode } from '@/types/promo-code';

interface PromoApplyBlockProps {
	/** Raffle the promo scopes to. */
	readonly raffleId: string;
	/** True when the user is signed in — gate for the input. */
	readonly isAuthenticated: boolean;
	/** Initial code seeded from the URL query (auto-validates on mount). */
	readonly initialCode: string | undefined;
	/** Monotonic counter — re-keys the input when an outside flow clears the promo. */
	readonly promoResetVersion: number;
	/** Disabled state forwarded from the parent (raffle closed / loading). */
	readonly disabled: boolean;
	/** Commits a validated promo into the shared store. */
	readonly onValidCode: (promo: ValidatedPromoCode) => void;
	/** Explicit user-initiated clear — resets promo AND quantity in the parent hook. */
	readonly onClear: () => void;
}

/**
 * Promo-code surface of the ticket purchase card. Authenticated users
 * get the input (collapsed trigger + expanded input + validated chip);
 * unauthenticated users see the sign-in hint since promo validation
 * requires a session.
 *
 * The `key` composition (`initialCode:promoResetVersion`) forces a
 * remount whenever either changes — lets the input reset its internal
 * validation state without reaching through refs.
 *
 * @param props - Raffle id, auth gate, initial code, reset version, handlers
 * @returns Promo input for authed users, sign-in hint for anonymous users
 */
export function PromoApplyBlock({
	raffleId,
	isAuthenticated,
	initialCode,
	promoResetVersion,
	disabled,
	onValidCode,
	onClear,
}: PromoApplyBlockProps) {
	if (!isAuthenticated) {
		return <p className="text-ink-500 text-sm">Sign in to apply promo codes</p>;
	}

	return (
		<PromoCodeInput
			key={`${initialCode ?? ''}:${promoResetVersion}`}
			raffleId={raffleId}
			onValidCode={onValidCode}
			onClear={onClear}
			disabled={disabled}
			initialCode={initialCode}
		/>
	);
}
