import { z } from 'zod';

// ==========================================
// Schemas
// ==========================================

/**
 * Schema for a token entry within a chain's crypto config.
 * Backend returns full token metadata per chain from GET /payments/crypto/config.
 * Used as a validation source and fallback when raffle-level `cryptoOptions` is unavailable.
 */
export const cryptoConfigTokenSchema = z.object({
	/** ERC-20 contract address on this chain (checksummed) */
	address: z.string(),
	/** Token decimal places (e.g., 6 for USDC, 18 for EARNM) */
	decimals: z.number(),
	/** Whether the token uses 1:1 USD pricing (no static price needed) */
	isStablecoin: z.boolean(),
	/** Human-readable name (e.g., "USD Coin") */
	name: z.string(),
	/** Ticker symbol (e.g., "USDC") */
	symbol: z.string(),
	/** Lowercase registry key (e.g., "usdc") — matches backend TOKEN_REGISTRY keys */
	tokenId: z.string(),
});

/**
 * Schema for a chain entry in the platform crypto config.
 * Returned by GET /payments/crypto/config — must match backend CryptoConfigChainDto.
 */
export const cryptoChainConfigSchema = z.object({
	chainId: z.number(),
	/** Block confirmations needed for payment finality on this chain */
	confirmationTarget: z.number(),
	/** Block explorer tx URL prefix (e.g., "https://arbiscan.io/tx") — append /{txHash} */
	explorerTxUrl: z.string(),
	name: z.string(),
	/** Tokens deployed and available for payment on this chain — immutable config data */
	tokens: z.array(cryptoConfigTokenSchema),
});

/**
 * Schema for the global crypto configuration.
 * Contains chain metadata (names, explorers, confirmation targets, deployed tokens)
 * that was previously hardcoded in the frontend.
 * FE caches this on startup — changes only on backend deploy.
 */
export const cryptoConfigSchema = z.object({
	chains: z.array(cryptoChainConfigSchema),
});

// ==========================================
// Inferred Types
// ==========================================

/** Single token entry from GET /payments/crypto/config — metadata for payment UI rendering. */
export type CryptoConfigToken = z.infer<typeof cryptoConfigTokenSchema>;
/** Chain entry with deployed tokens — drives chain/token selector UI in crypto checkout. */
export type CryptoChainConfig = z.infer<typeof cryptoChainConfigSchema>;
/** Top-level crypto config from GET /payments/crypto/config — cached on FE startup. */
export type CryptoConfig = z.infer<typeof cryptoConfigSchema>;
