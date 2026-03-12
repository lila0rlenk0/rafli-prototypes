import { getAddress, isAddress } from 'viem';
import { z } from 'zod';

// ==========================================
// Shared Validators
// ==========================================

/**
 * Validates and normalizes EVM addresses to EIP-55 checksum format.
 * Uses viem's `isAddress` for validation, then `getAddress` for checksumming.
 * This ensures all addresses stored/compared in the app are consistently cased —
 * prevents bugs from mixed-case comparisons (e.g. wagmi returns lowercase,
 * backend expects checksummed).
 */
const evmAddressSchema = z
	.string()
	.refine(v => isAddress(v, { strict: false }), 'Invalid EVM address')
	.transform(getAddress);

/**
 * Validates a string is parseable as a BigInt (non-negative integer).
 * Uses actual BigInt parsing instead of regex — catches leading zeros,
 * whitespace, and other edge cases that /^\d+$/ would miss or allow.
 */
function isBigIntString(value: string): boolean {
	try {
		return BigInt(value) >= 0n;
	} catch {
		return false;
	}
}
const bigIntStringSchema = z
	.string()
	.refine(isBigIntString, 'Must be a non-negative integer string');

// ==========================================
// Schemas
// ==========================================

/**
 * Schema for wallet entity returned by GET /me/wallets
 */
export const walletResponseSchema = z.object({
	id: z.string(),
	address: evmAddressSchema,
	verifiedAt: z.string(),
	createdAt: z.string(),
});

/**
 * Schema for wallet verification payload (EIP-191 signature)
 */
export const verifyWalletPayloadSchema = z.object({
	/** EVM wallet address — 0x prefix + 40 hex chars */
	address: evmAddressSchema,
	message: z.string().min(1),
	signature: z.string().min(1),
	/** ISO 8601 timestamp string — backend parses with `new Date(timestamp)` */
	timestamp: z.string().min(1),
});

/**
 * Schema for crypto checkout session returned by POST /payments/crypto/checkout
 */
export const cryptoCheckoutSessionSchema = z.object({
	id: z.string(),
	amount: z.string(),
	/** On-chain token units as integer string (e.g. "10000000" for 10 USDC at 6 decimals) */
	amountRaw: bigIntStringSchema,
	chainId: z.number(),
	/** ERC20 token contract address — validated as 0x + 40 hex */
	tokenAddress: evmAddressSchema,
	/** Treasury wallet that receives payment — validated as 0x + 40 hex */
	treasuryAddress: evmAddressSchema,
	orderId: z.string(),
	expiresAt: z.string(),
});

/**
 * Schema for creating a crypto checkout session
 */
export const createCryptoCheckoutPayloadSchema = z.object({
	orderId: z.string().min(1),
	chainId: z.number(),
	/** Verified wallet address — must be linked via EIP-191 first */
	walletAddress: evmAddressSchema,
	/** Token slug (e.g. 'usdc', 'usdt', 'earnm') — backend validates against registry */
	token: z.string().min(1),
});

/**
 * Schema for submitting a crypto transaction hash
 */
export const submitCryptoTxPayloadSchema = z.object({
	sessionId: z.string().min(1),
	txHash: z.string().min(1),
});

/**
 * Schema for frontend-driven confirmation request.
 * Sent when on-chain confirmations reach the chain's target threshold,
 * allowing backend to finalize immediately instead of waiting for the cron.
 */
export const confirmCryptoTxPayloadSchema = z.object({
	sessionId: z.string().min(1),
	txHash: z.string().min(1),
	chainId: z.number(),
	/** Number of on-chain confirmations observed by the frontend */
	confirmations: z.number().min(1),
});

/**
 * Schema for wallets list response
 */
export const walletsListResponseSchema = z.object({
	wallets: z.array(walletResponseSchema),
});

// ==========================================
// Inferred Types
// ==========================================

export type WalletResponse = z.infer<typeof walletResponseSchema>;
export type VerifyWalletPayload = z.infer<typeof verifyWalletPayloadSchema>;
export type CryptoCheckoutSession = z.infer<typeof cryptoCheckoutSessionSchema>;
export type CreateCryptoCheckoutPayload = z.infer<
	typeof createCryptoCheckoutPayloadSchema
>;
export type SubmitCryptoTxPayload = z.infer<typeof submitCryptoTxPayloadSchema>;
export type ConfirmCryptoTxPayload = z.infer<
	typeof confirmCryptoTxPayloadSchema
>;
export type WalletsListResponse = z.infer<typeof walletsListResponseSchema>;
