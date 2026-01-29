/**
 * Verification Links
 *
 * Utilities for generating external blockchain explorer links.
 */

const ARBISCAN_BASE = 'https://arbiscan.io';
const VRF_CONTRACT = '0x8757b0C757fD59B01c0d217b6299b6fADD81512B';
const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

/**
 * Gets the Arbiscan URL for the VRF contract
 * @returns Arbiscan contract URL
 */
export function getVrfContractUrl(): string {
	return `${ARBISCAN_BASE}/address/${VRF_CONTRACT}`;
}

/**
 * Gets the Arbiscan URL for a transaction
 * @param txHash - Transaction hash
 * @returns Arbiscan transaction URL
 */
export function getArbiscanTxUrl(txHash: string): string {
	return `${ARBISCAN_BASE}/tx/${txHash}`;
}

/**
 * Gets the IPFS gateway URL for a hash
 * @param hash - IPFS content hash
 * @returns IPFS gateway URL
 */
export function getIpfsUrl(hash: string): string {
	return `${IPFS_GATEWAY}${hash}`;
}
