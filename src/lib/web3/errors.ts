import { BaseError, TransactionNotFoundError } from 'viem';

/** EIP-1193 standard code for user-initiated wallet rejection */
const EIP_1193_USER_REJECTION_CODE = 4001;

/**
 * Detects if an error is a user wallet rejection (e.g. clicked "Reject" in MetaMask).
 * wagmi/viem throw errors with specific codes or messages for user denials.
 *
 * @param error - Error from wagmi/viem wallet interaction
 * @returns True if the user intentionally rejected the action
 */
export function isUserRejection(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	const message = error.message.toLowerCase();
	// viem always sets error.name for typed errors — most reliable check.
	// Falls back to message patterns for non-viem wallet SDKs (e.g. MetaMask injected provider).
	// EIP-1193 providers set `code: 4001` for user rejections — narrowed via `in` guard
	// then typeof check to avoid unsafe casts.
	const code =
		'code' in error && typeof error.code === 'number' ? error.code : undefined;
	return (
		error.name === 'UserRejectedRequestError' ||
		message.includes('user rejected') ||
		message.includes('user denied') ||
		message.includes('rejected the request') ||
		code === EIP_1193_USER_REJECTION_CODE
	);
}

/**
 * Detects the specific viem error that means "the RPC can no longer find this tx".
 *
 * Why this helper exists:
 * - wagmi's `useTransaction` surfaces many error classes through one `error` field
 * - generic transport/request failures are noisy but recoverable during confirming
 * - only `TransactionNotFoundError` is strong enough evidence for the reorg path
 *
 * viem nests typed errors through `cause`, so walk the chain instead of only
 * checking the top-level error instance.
 *
 * @param error - Error from wagmi/viem transaction polling
 * @returns True if the error indicates the transaction was dropped from the mempool
 */
export function isTransactionNotFound(error: unknown): boolean {
	if (error instanceof TransactionNotFoundError) return true;
	// Some bundlers/runtimes break instanceof for cross-realm errors — check name as fallback.
	if (error instanceof Error && error.name === 'TransactionNotFoundError')
		return true;

	// viem's BaseError keeps the full typed cause chain. Using walk avoids
	// re-implementing recursive cause traversal and keeps wrapped errors visible.
	if (error instanceof BaseError) {
		return (
			error.walk(
				candidate =>
					candidate instanceof TransactionNotFoundError ||
					(candidate instanceof Error &&
						candidate.name === 'TransactionNotFoundError'),
			) !== null
		);
	}

	// Fallback for non-viem wrappers that still preserve `cause`.
	if (
		error &&
		typeof error === 'object' &&
		'cause' in error &&
		error.cause !== undefined
	) {
		return isTransactionNotFound(error.cause);
	}

	return false;
}
