import { z } from 'zod';

// ==========================================
// Schemas
// ==========================================

/**
 * Schema for a chain entry in the platform crypto config.
 * Returned by GET /payments/crypto/config.
 */
export const cryptoChainConfigSchema = z.object({
	chainId: z.number(),
	name: z.string(),
	explorerTxUrl: z.string(),
	confirmationTarget: z.number(),
});

/**
 * Schema for the global crypto configuration.
 * Contains chain metadata (names, explorers, confirmation targets)
 * that was previously hardcoded in the frontend.
 */
export const cryptoConfigSchema = z.object({
	chains: z.array(cryptoChainConfigSchema),
});

// ==========================================
// Inferred Types
// ==========================================

export type CryptoChainConfig = z.infer<typeof cryptoChainConfigSchema>;
export type CryptoConfig = z.infer<typeof cryptoConfigSchema>;
