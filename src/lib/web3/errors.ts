/**
 * Detects if an error is a user wallet rejection (e.g. clicked "Reject" in MetaMask).
 * wagmi/viem throw errors with specific codes or messages for user denials.
 *
 * @param error - Error from wagmi/viem wallet interaction
 * @returns True if the user intentionally rejected the action
 */
export function isUserRejection(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	const msg = error.message.toLowerCase();
	// viem always sets error.name for typed errors — most reliable check
	// Falls back to message patterns for non-viem wallet SDKs
	return (
		(error as { name?: string }).name === 'UserRejectedRequestError' ||
		msg.includes('user rejected') ||
		msg.includes('user denied') ||
		msg.includes('rejected the request') ||
		(error as { code?: number }).code === 4001
	);
}
