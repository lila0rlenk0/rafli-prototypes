/**
 * Verification Links
 *
 * Utilities for generating external blockchain explorer links.
 */

import { clientEnv } from '@/env/client';

/**
 * Gets the Arbiscan URL for the VRF contract
 * @returns Arbiscan contract URL
 */
export function getVrfContractUrl(): string {
	return `${clientEnv.NEXT_PUBLIC_ARBISCAN_BASE_URL}/address/${clientEnv.NEXT_PUBLIC_VRF_CONTRACT_ADDRESS}`;
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
