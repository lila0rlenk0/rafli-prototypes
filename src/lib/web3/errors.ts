import { BaseError, TransactionNotFoundError } from 'viem';

/** EIP-1193 standard code for user-initiated wallet rejection */
const EIP_1193_USER_REJECTION_CODE = 4001;
/** Common transport-level message returned by wallet RPC clients on network failure */
const FAILED_TO_FETCH_MESSAGE = 'failed to fetch';
/** Viem/RPC wording when max fee cap is below current block base fee */
const FEE_CAP_TOO_LOW_MESSAGE = 'fee cap';
const BASE_FEE_MESSAGE = 'base fee';
const MAX_FEE_PER_GAS_MESSAGE = 'max fee per gas';

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

/**
 * Detects wallet RPC transport failures that bubble up as generic "Failed to fetch" errors.
 *
 * Why this helper exists:
 * - MetaMask and some wallet providers surface node/network outages as `-32603` with
 *   message "Failed to fetch", which viem can wrap as contract execution noise
 * - we need a deterministic way to show users actionable guidance ("check RPC/network")
 *   instead of a misleading "contract reverted" message
 *
 * @param error - Error from wallet transaction submission
 * @returns True if the error chain contains a transport-level fetch failure
 */
export function isWalletRpcFetchFailure(error: unknown): boolean {
	if (hasFailedToFetchMessage(error)) return true;

	if (error instanceof BaseError) {
		return error.walk(candidate => hasFailedToFetchMessage(candidate)) !== null;
	}

	if (
		error &&
		typeof error === 'object' &&
		'cause' in error &&
		error.cause !== undefined
	) {
		return isWalletRpcFetchFailure(error.cause);
	}

	return false;
}

/**
 * Detects EIP-1559 fee-cap mismatch errors from wallet submission.
 *
 * Why this helper exists:
 * - during volatile blocks, wallet-provided `maxFeePerGas` can lag behind current base fee
 * - viem wraps this as nested `FeeCapTooLowError` / `TransactionExecutionError`
 * - we should keep checkout retryable with explicit guidance instead of generic failure copy
 *
 * @param error - Error from wallet transaction submission
 * @returns True if the error chain indicates max fee cap below block base fee
 */
export function isWalletFeeCapTooLow(error: unknown): boolean {
	if (hasFeeCapTooLowSignal(error)) return true;

	if (error instanceof BaseError) {
		return error.walk(candidate => hasFeeCapTooLowSignal(candidate)) !== null;
	}

	if (
		error &&
		typeof error === 'object' &&
		'cause' in error &&
		error.cause !== undefined
	) {
		return isWalletFeeCapTooLow(error.cause);
	}

	return false;
}

/**
 * Maps wallet transfer errors to user-facing copy.
 *
 * @param error - Error from wallet transaction submission
 * @returns Human-readable message for checkout failure UI
 */
export function getWalletTransferErrorMessage(error: unknown): string {
	if (isWalletFeeCapTooLow(error)) {
		return 'Network fees changed while sending. Please retry the transaction so your wallet can refresh gas fees.';
	}

	if (isWalletRpcFetchFailure(error)) {
		return 'Wallet RPC request failed. Check your wallet network/RPC connection and try again.';
	}

	return 'Transaction failed. Please try again.';
}

/**
 * Case-insensitive match for transport-level fetch failures across Error and plain objects.
 */
function hasFailedToFetchMessage(error: unknown): boolean {
	if (!error || typeof error !== 'object') {
		return false;
	}

	const errorMessage = 'message' in error ? error.message : undefined;
	if (
		typeof errorMessage === 'string' &&
		errorMessage.toLowerCase().includes(FAILED_TO_FETCH_MESSAGE)
	) {
		return true;
	}

	const errorStack = 'stack' in error ? error.stack : undefined;
	return (
		typeof errorStack === 'string' &&
		errorStack.toLowerCase().includes(FAILED_TO_FETCH_MESSAGE)
	);
}

/**
 * Matches viem fee-cap-too-low errors across Error names and nested message payloads.
 */
function hasFeeCapTooLowSignal(error: unknown): boolean {
	if (!error || typeof error !== 'object') {
		return false;
	}

	const errorName = 'name' in error ? error.name : undefined;
	if (errorName === 'FeeCapTooLowError') {
		return true;
	}

	const errorMessage = 'message' in error ? error.message : undefined;
	if (typeof errorMessage === 'string') {
		const normalizedMessage = errorMessage.toLowerCase();
		if (
			(normalizedMessage.includes(FEE_CAP_TOO_LOW_MESSAGE) ||
				normalizedMessage.includes(MAX_FEE_PER_GAS_MESSAGE)) &&
			normalizedMessage.includes(BASE_FEE_MESSAGE)
		) {
			return true;
		}
	}

	const errorStack = 'stack' in error ? error.stack : undefined;
	if (typeof errorStack !== 'string') {
		return false;
	}

	const normalizedStack = errorStack.toLowerCase();
	return (
		(normalizedStack.includes(FEE_CAP_TOO_LOW_MESSAGE) ||
			normalizedStack.includes(MAX_FEE_PER_GAS_MESSAGE)) &&
		normalizedStack.includes(BASE_FEE_MESSAGE)
	);
}
