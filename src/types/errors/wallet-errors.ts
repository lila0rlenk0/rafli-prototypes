import type { CommonErrorCode } from './common-errors';

/**
 * Wallet Error Codes
 *
 * Wallet-specific error codes matching backend "auth:wallet:*" error codes
 */

export const WALLET_ERROR_CODES = {
	/** Wallet not verified on backend */
	NOT_VERIFIED: 'auth:wallet:not-verified',
	/** EIP-191 signature is invalid */
	SIGNATURE_INVALID: 'auth:wallet:signature-invalid',
	/** Signature timestamp expired */
	SIGNATURE_EXPIRED: 'auth:wallet:signature-expired',
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

/**
 * Wallet error code type
 */
export type WalletErrorCode =
	| (typeof WALLET_ERROR_CODES)[keyof typeof WALLET_ERROR_CODES]
	| CommonErrorCode;
