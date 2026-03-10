import { z } from 'zod';

// ==========================================
// Constants
// ==========================================

/**
 * Supported EVM chain IDs for crypto payments
 * Mainnets: Ethereum, Arbitrum, Base, Polygon
 * Testnets: Sepolia, Arbitrum Sepolia, Base Sepolia
 */
const SUPPORTED_CHAINS = {
	MAINNET: 1,
	ARBITRUM: 42_161,
	BASE: 8453,
	POLYGON: 137,
	SEPOLIA: 11_155_111,
	ARBITRUM_SEPOLIA: 421_614,
	BASE_SEPOLIA: 84_532,
} as const;

/**
 * Human-readable chain names for UI display
 */
export const CHAIN_NAMES: Record<number, string> = {
	[SUPPORTED_CHAINS.MAINNET]: 'Ethereum',
	[SUPPORTED_CHAINS.ARBITRUM]: 'Arbitrum',
	[SUPPORTED_CHAINS.BASE]: 'Base',
	[SUPPORTED_CHAINS.POLYGON]: 'Polygon',
	[SUPPORTED_CHAINS.SEPOLIA]: 'Sepolia',
	[SUPPORTED_CHAINS.ARBITRUM_SEPOLIA]: 'Arbitrum Sepolia',
	[SUPPORTED_CHAINS.BASE_SEPOLIA]: 'Base Sepolia',
};

// ==========================================
// Schemas
// ==========================================

/**
 * Schema for wallet entity returned by GET /me/wallets
 */
export const walletResponseSchema = z.object({
	id: z.string(),
	address: z.string(),
	verifiedAt: z.string(),
	createdAt: z.string(),
});

/**
 * Schema for wallet verification payload (EIP-191 signature)
 */
export const verifyWalletPayloadSchema = z.object({
	address: z.string().min(1),
	message: z.string().min(1),
	signature: z.string().min(1),
	/** ISO 8601 timestamp string — backend parses with `new Date(timestamp)` */
	timestamp: z.string().min(1),
});

/**
 * Schema for crypto checkout session returned by POST /payments/crypto/checkout
 */
/** Validates EVM address format — 0x prefix + 40 hex chars */
const evmAddressSchema = z.string().regex(/^0x[0-9a-fA-F]{40}$/);

export const cryptoCheckoutSessionSchema = z.object({
	id: z.string(),
	amount: z.string(),
	amountRaw: z.string(),
	chainId: z.number(),
	/** ERC20 token contract address — validated as 0x + 40 hex */
	tokenAddress: evmAddressSchema,
	/** Treasury wallet that receives payment — validated as 0x + 40 hex */
	treasuryAddress: evmAddressSchema,
	orderId: z.string(),
	expiresAt: z.string(),
});

/**
 * Schema for creating a crypto checkout session
 */
export const createCryptoCheckoutPayloadSchema = z.object({
	orderId: z.string().min(1),
	chainId: z.number(),
	walletAddress: z.string().min(1),
	/** Stablecoin token — backend requires this field, defaults to 'usdc' */
	token: z.string().min(1),
});

/**
 * Schema for submitting a crypto transaction hash
 */
export const submitCryptoTxPayloadSchema = z.object({
	sessionId: z.string().min(1),
	txHash: z.string().min(1),
});

/**
 * Schema for wallets list response
 */
export const walletsListResponseSchema = z.object({
	wallets: z.array(walletResponseSchema),
});

// ==========================================
// Inferred Types
// ==========================================

export type WalletResponse = z.infer<typeof walletResponseSchema>;
export type VerifyWalletPayload = z.infer<typeof verifyWalletPayloadSchema>;
export type CryptoCheckoutSession = z.infer<typeof cryptoCheckoutSessionSchema>;
export type CreateCryptoCheckoutPayload = z.infer<
	typeof createCryptoCheckoutPayloadSchema
>;
export type SubmitCryptoTxPayload = z.infer<typeof submitCryptoTxPayloadSchema>;
export type WalletsListResponse = z.infer<typeof walletsListResponseSchema>;
