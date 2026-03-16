import type { CommonErrorCode } from './common-errors';

/**
 * Wallet Error Codes
 *
 * Wallet-specific error codes matching BE "auth:wallet:*" error responses.
 * Returned by POST /auth/verify-wallet and GET /me/wallets endpoints.
 */

export const WALLET_ERROR_CODES = {
	/** Wallet not verified on backend */
	NOT_VERIFIED: 'auth:wallet:not-verified',
	/** EIP-191 signature verification failed — recovered address doesn't match claimed address */
	SIGNATURE_INVALID: 'auth:wallet:signature-invalid',
	/** Signature payload is malformed — not a valid hex-encoded ECDSA signature */
	INVALID_SIGNATURE: 'auth:wallet:invalid-signature',
	/** Signature timestamp expired */
	SIGNATURE_EXPIRED: 'auth:wallet:signature-expired',
	/** Timestamp payload was malformed */
	INVALID_TIMESTAMP: 'auth:wallet:invalid-timestamp',
	/** Maximum linked wallets reached */
	LIMIT_REACHED: 'auth:wallet:limit-reached',
	/** Signed message doesn't match expected format — address/userId/timestamp mismatch */
	MESSAGE_MISMATCH: 'auth:wallet:message-mismatch',
	/** Invalid wallet address format */
	INVALID_ADDRESS: 'auth:wallet:invalid-address',
	/** Wallet not found */
	NOT_FOUND: 'auth:wallet:not-found',
	/** Response validation failed (Zod parse error on verify/fetch response) */
	VALIDATION_FAILED: 'auth:wallet:validation-failed',
	/** Generic fetch failure */
	FETCH_FAILED: 'fetch_failed',
} as const;

/** Union of all error codes that wallet service actions can return. */
export type WalletErrorCode =
	| (typeof WALLET_ERROR_CODES)[keyof typeof WALLET_ERROR_CODES]
	| CommonErrorCode;
