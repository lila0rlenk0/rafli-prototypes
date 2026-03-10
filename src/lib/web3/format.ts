import { formatUnits } from 'viem';

import type { CryptoCheckoutSession } from '@/types/wallet';

// ==========================================
// Constants
// ==========================================

/**
 * USDC uses 6 decimals across all chains (not 18 like ETH)
 * Used to format amountRaw for display: 10000000 → "10.00"
 */
const STABLECOIN_DECIMALS = 6;

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

// ==========================================
// Formatting Functions
// ==========================================

/**
 * Formats payment amount from raw token units to human display
 * e.g. session with amountRaw "10000000" → "10.00"
 *
 * @param session - Crypto checkout session (null returns placeholder)
 * @returns Formatted amount string with 2 decimal places
 */
export function formatPaymentAmount(
	session: CryptoCheckoutSession | null,
): string {
	if (!session) return '\u2014';
	const formatted = formatUnits(BigInt(session.amountRaw), STABLECOIN_DECIMALS);
	return parseFloat(formatted).toFixed(2);
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
 * Formats stablecoin token balance for display
 * Shows 2 decimal places matching USD convention
 *
 * @param balance - Token balance from useBalance hook
 * @returns Formatted balance string with 2 decimal places
 */
export function formatTokenBalance(balance: BalanceData | undefined): string {
	if (!balance) return '\u2014';
	return parseFloat(formatUnits(balance.value, balance.decimals)).toFixed(2);
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
