import { getAddress, isAddress } from 'viem';
import { z } from 'zod';

import { orderStatusSchema } from './order';

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
		// BigInt() throws on non-integer strings (decimals, letters, empty) — expected
		return false;
	}
}
const bigIntStringSchema = z
	.string()
	.refine(isBigIntString, 'Must be a non-negative integer string');

// `0x` prefix + 64 hex chars = 66 chars. Backend uses the same shape
// (`txHashSchema`); FE matches so malformed pastes fail before the
// network call instead of producing a generic backend rejection.
const txHashSchema = z
	.string()
	.regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash');

// Backend identifies tokens by lowercase registry key (`usdc`, `usdt`,
// `earnm`). Capped at 20 to mirror the backend `tokenIdSchema` ceiling.
const tokenIdInputSchema = z
	.string()
	.min(1)
	.max(20)
	.regex(/^[a-z0-9_-]+$/, 'Token identifiers are lowercase alphanumeric');

/**
 * Verified wallet entity from backend.
 *
 * Validation boundary: server-side — parsed in wallet-related server actions.
 * Address is normalized to EIP-55 checksum format via the `evmAddressSchema` transform.
 */
export const walletResponseSchema = z.object({
	id: z.string(),
	address: evmAddressSchema,
	verifiedAt: z.string(),
	createdAt: z.string(),
});

/**
 * Schema for wallet verification payload (EIP-191 signature).
 * Sent to POST /me/wallets/verify — backend verifies signature against expected message.
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
	/**
	 * Canonical ticket quantity bound to this checkout session. Optional to
	 * stay forward-compatible with older backend deploys that don't surface
	 * it yet; when present, the FE syncs its `confirmedTicketQuantity` ref
	 * from this value on any session-hydration path so a page refresh during
	 * the confirming window no longer risks reporting a parent-prop-drifted
	 * quantity to `onSuccess`. Bug class fix: stale state on resume.
	 */
	ticketQuantity: z.number().int().positive().optional(),
});

/**
 * Schema for submitting a crypto transaction hash.
 * Mirrors backend validation so malformed inputs fail inline instead of
 * round-tripping for a generic 400.
 */
export const submitCryptoTxPayloadSchema = z.object({
	sessionId: z.uuidv7(),
	txHash: txHashSchema,
});

/**
 * Schema for frontend-driven confirmation request.
 * Sent when on-chain confirmations reach the chain's target threshold,
 * allowing backend to finalize immediately instead of waiting for the cron.
 */
export const confirmCryptoTxPayloadSchema = z.object({
	sessionId: z.uuidv7(),
	txHash: txHashSchema,
	chainId: z.number().int().positive(),
	/** Number of on-chain confirmations observed by the frontend */
	confirmations: z.number().int().min(1),
});

export const walletsListResponseSchema = z.object({
	wallets: z.array(walletResponseSchema),
});

/**
 * Schema for POST /payments/crypto/atomic-checkout request payload.
 * Combines order fields (raffle, quantity, promo) with crypto session fields
 * (chain, wallet, token) — backend creates both atomically.
 */
export const atomicCryptoCheckoutPayloadSchema = z.object({
	raffleId: z.uuidv7(),
	// Backend caps an order at 100 tickets; enforce inline so the user
	// sees a form error instead of a 400 after submitting.
	ticketQuantity: z.number().int().positive().max(100),
	promoCode: z.string().optional(),
	chainId: z.number().int().positive(),
	walletAddress: evmAddressSchema,
	token: tokenIdInputSchema,
});

/**
 * Schema for the atomic crypto checkout response.
 * POST /payments/crypto/atomic-checkout returns order + session in one call.
 * `session` is null when order is $0 (fully discounted by promo — backend auto-completes).
 *
 * Order shape is intentionally minimal — FE only needs `id` for session binding,
 * `totalAmount` for the $0 promo check, and `status` for completed-order detection.
 * Extra fields (promoRedemption, currency, etc.) are silently stripped by Zod.
 */
export const atomicCryptoCheckoutResponseSchema = z.object({
	order: z.object({
		id: z.string(),
		/** Order status — 'completed' when $0 promo auto-completes, 'pending' otherwise */
		status: orderStatusSchema,
		totalAmount: z.string(),
	}),
	session: cryptoCheckoutSessionSchema.nullable(),
	/** True when backend cancelled an incompatible session (Stripe or stale crypto) */
	previousSessionCancelled: z.boolean(),
});

/** Verified wallet entity from GET /me/wallets. */
export type WalletResponse = z.infer<typeof walletResponseSchema>;
/** Payload for POST /me/wallets/verify — EIP-191 signed message + metadata. */
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
/** Payload for POST /payments/crypto/atomic-checkout — order + crypto session creation. */
export type AtomicCryptoCheckoutPayload = z.infer<
	typeof atomicCryptoCheckoutPayloadSchema
>;
/** Response from POST /payments/crypto/atomic-checkout — order + session created atomically. */
export type AtomicCryptoCheckoutResponse = z.infer<
	typeof atomicCryptoCheckoutResponseSchema
>;
