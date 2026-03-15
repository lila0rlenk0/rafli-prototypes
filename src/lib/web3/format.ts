import { formatUnits } from 'viem';

import type { CryptoCheckoutSession } from '@/types/wallet';

// ==========================================
// Types
// ==========================================

/**
 * Minimal balance shape from wagmi's useBalance hook
 * Avoids importing wagmi types in a pure utility file
 */
interface BalanceData {
	value: bigint;
	decimals: number;
	symbol?: string;
}

/**
 * Formats a decimal string for display.
 * Preserves >=2 fraction digits (USD convention), trims trailing zeros beyond
 * 2dp, and caps at 4dp to avoid distracting precision on non-stablecoin amounts.
 *
 * @param value - Backend decimal string (e.g. "10.50000", "0.1234567")
 * @returns Formatted string with 2-4 meaningful fraction digits
 */
function formatDisplayDecimal(value: string): string {
	const [integerPart, rawFraction = ''] = value.split('.');

	if (rawFraction.length === 0) {
		return `${integerPart}.00`;
	}

	const trimmedFraction = rawFraction.replace(/0+$/, '');
	if (trimmedFraction.length === 0) {
		return `${integerPart}.00`;
	}

	if (trimmedFraction.length <= 2) {
		return `${integerPart}.${trimmedFraction.padEnd(2, '0')}`;
	}

	return `${integerPart}.${trimmedFraction.slice(0, 4)}`;
}

// ==========================================
// Formatting Functions
// ==========================================

/**
 * Formats payment amount from session's `amount` field (human-readable string).
 * Uses `amount` instead of parsing `amountRaw` with hardcoded decimals —
 * works for any token regardless of decimal count (6 for USDC, 18 for EARNM).
 *
 * @param session - Crypto checkout session (null returns placeholder)
 * @returns Formatted amount string preserving up to 4 meaningful decimals
 */
export function formatPaymentAmount(
	session: CryptoCheckoutSession | null,
): string {
	if (!session) return '\u2014';
	return formatDisplayDecimal(session.amount);
}

/**
 * Formats native token balance for gas indicator display
 * Shows 4 decimal places for ETH/MATIC precision
 *
 * @param balance - Native balance from useBalance hook
 * @returns Formatted balance string with 4 decimal places
 */
export function formatNativeBalance(balance: BalanceData | undefined): string {
	if (!balance) return '\u2014';
	return parseFloat(formatUnits(balance.value, balance.decimals)).toFixed(4);
}

/**
 * Formats ERC20 token balance for display.
 * Stablecoins (6 decimals) → 2 decimal places (USD convention).
 * Non-stablecoins (18 decimals, e.g. EARNM) → 4 decimal places for precision.
 * Threshold: tokens with ≤8 decimals are treated as stablecoin-like.
 *
 * @param balance - Token balance from useBalance hook
 * @returns Formatted balance string
 */
export function formatTokenBalance(balance: BalanceData | undefined): string {
	if (!balance) return '\u2014';
	// 6-decimal tokens (USDC, USDT) → 2dp; 18-decimal tokens (EARNM) → 4dp
	const displayDecimals = balance.decimals <= 8 ? 2 : 4;
	return parseFloat(formatUnits(balance.value, balance.decimals)).toFixed(
		displayDecimals,
	);
}

/**
 * Truncates an Ethereum address for display: 0x1234...5678
 *
 * @param addr - Full hex address
 * @returns Truncated address string
 */
export function truncateAddress(addr: string): string {
	return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
