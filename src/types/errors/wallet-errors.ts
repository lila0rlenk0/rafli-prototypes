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
	/** Invalid wallet address format */
	INVALID_ADDRESS: 'auth:wallet:invalid-address',
	/** Wallet not found */
	NOT_FOUND: 'auth:wallet:not-found',
	/** Generic fetch failure */
	FETCH_FAILED: 'fetch_failed',
} as const;

/**
 * Wallet error code type
 */
export type WalletErrorCode =
	| (typeof WALLET_ERROR_CODES)[keyof typeof WALLET_ERROR_CODES]
	| CommonErrorCode;
