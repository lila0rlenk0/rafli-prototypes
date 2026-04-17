/**
 * Verification Links
 *
 * Utilities for generating external blockchain explorer links.
 */

import { clientEnv } from '@/env/client';

/**
 * Gets the Arbiscan URL for the Chainlink VRF Coordinator — the chainlink-owned
 * oracle contract that generates and delivers verifiable randomness on-chain.
 * Use this when surfacing the cryptographic source of randomness to end users.
 * @returns Arbiscan contract URL for the Chainlink VRF Coordinator
 */
export function getVrfCoordinatorUrl(): string {
	return `${clientEnv.NEXT_PUBLIC_ARBISCAN_BASE_URL}/address/${clientEnv.NEXT_PUBLIC_VRF_COORDINATOR_ADDRESS}`;
}

/**
 * Gets the Arbiscan URL for the Rafli VRF Handler — our consumer contract that
 * receives randomness from the Chainlink Coordinator and drives winner selection.
 * Distinct from the Coordinator: this is application code, not an oracle.
 * @returns Arbiscan contract URL for the Rafli VRF handler
 */
export function getVrfHandlerUrl(): string {
	return `${clientEnv.NEXT_PUBLIC_ARBISCAN_BASE_URL}/address/${clientEnv.NEXT_PUBLIC_VRF_HANDLER_ADDRESS}`;
}

/**
 * Gets the Arbiscan URL for a transaction
 * @param txHash - Transaction hash
 * @returns Arbiscan transaction URL
 */
export function getArbiscanTxUrl(txHash: string): string {
	return `${clientEnv.NEXT_PUBLIC_ARBISCAN_BASE_URL}/tx/${txHash}`;
}

/**
 * Gets the IPFS gateway URL for a hash
 * @param hash - IPFS content hash
 * @returns IPFS gateway URL
 */
export function getIpfsUrl(hash: string): string {
	return `${clientEnv.NEXT_PUBLIC_IPFS_GATEWAY_URL}${hash}`;
}
