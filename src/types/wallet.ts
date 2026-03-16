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
	.transform(v => getAddress(v));

/**
 * Validates a string is parseable as a BigInt (non-negative integer).
 * Uses actual BigInt parsing instead of regex — catches leading zeros,
 * whitespace, and other edge cases that /^\d+$/ would miss or allow.
 */
function isBigIntString(value: string): boolean {
	try {
		return BigInt(value) >= BigInt(0);
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
 * Schema for wallet verification payload (EIP-191 signature).
 * Sent to POST /auth/verify-wallet — backend verifies signature against expected message.
 *
 * Expected message format (EIP-191 personal_sign):
 *   "Link wallet {checksumAddress} to Raffles account {userId} at {timestamp}"
 * Backend reconstructs this from address + userId + timestamp, then recovers signer.
 */
export const verifyWalletPayloadSchema = z.object({
	/** EVM wallet address — 0x prefix + 40 hex chars */
	address: evmAddressSchema,
	/** EIP-191 plaintext message signed by the wallet — must match BE reconstruction exactly */
	message: z.string().min(1),
	/** Hex-encoded ECDSA signature from wallet — BE recovers signer address from this */
	signature: z.string().min(1),
	/** ISO 8601 timestamp string — backend parses with `new Date(timestamp)`, rejects if >5min old */
	timestamp: z.string().min(1),
});

/**
 * Schema for crypto checkout session returned by POST /payments/crypto/checkout.
 * `confirmDeadline` and `confirmationTarget` are always present — backend guarantees non-null.
 */
export const cryptoCheckoutSessionSchema = z.object({
	id: z.string(),
	amount: z.string(),
	/** BE-stored wallet address — enables client-side match validation against connected wallet */
	walletAddress: evmAddressSchema,
	/** On-chain token units as integer string (e.g. "10000000" for 10 USDC at 6 decimals) */
	amountRaw: bigIntStringSchema,
	chainId: z.number(),
	/** ERC20 token contract address — validated as 0x + 40 hex */
	tokenAddress: evmAddressSchema,
	/** Treasury wallet that receives payment — validated as 0x + 40 hex */
	treasuryAddress: evmAddressSchema,
	orderId: z.string(),
	expiresAt: z.string(),
	/** Absolute deadline for tx hash submission — always present (expiresAt + 10min) */
	submitDeadline: z.string(),
	/** Absolute deadline for on-chain confirmations — backend always provides this */
	confirmDeadline: z.string(),
	/** Number of on-chain confirmations required — from backend session, not FE config */
	confirmationTarget: z.number(),
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

/**
 * Schema for the atomic crypto checkout response.
 * POST /payments/crypto/atomic-checkout returns order + session in one call.
 * `session` is null when order is $0 (fully discounted by promo — backend auto-completes).
 */
export const atomicCryptoCheckoutResponseSchema = z.object({
	order: z.object({
		id: z.string(),
		totalAmount: z.string(),
	}),
	session: cryptoCheckoutSessionSchema.nullable(),
	/** True when backend cancelled an incompatible session (Stripe or stale crypto) */
	previousSessionCancelled: z.boolean(),
});

// ==========================================
// Inferred Types
// ==========================================

/** Verified wallet entity from GET /me/wallets. */
export type WalletResponse = z.infer<typeof walletResponseSchema>;
/** Payload for POST /auth/verify-wallet — EIP-191 signed message + metadata. */
export type VerifyWalletPayload = z.infer<typeof verifyWalletPayloadSchema>;
/** Crypto session from POST /payments/crypto/checkout — contains on-chain payment details. */
export type CryptoCheckoutSession = z.infer<typeof cryptoCheckoutSessionSchema>;
/** Payload for POST /payments/crypto/submit — tx hash submission after on-chain send. */
export type SubmitCryptoTxPayload = z.infer<typeof submitCryptoTxPayloadSchema>;
/** Payload for POST /payments/crypto/confirm — FE-driven early finalization when confirmations reach target. */
export type ConfirmCryptoTxPayload = z.infer<
	typeof confirmCryptoTxPayloadSchema
>;
/** Response from GET /me/wallets — array of verified wallets for the current user. */
export type WalletsListResponse = z.infer<typeof walletsListResponseSchema>;
/** Response from POST /payments/crypto/atomic-checkout — order + session created atomically. */
export type AtomicCryptoCheckoutResponse = z.infer<
	typeof atomicCryptoCheckoutResponseSchema
>;
