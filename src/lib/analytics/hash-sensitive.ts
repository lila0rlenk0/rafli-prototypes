import { createHash } from 'node:crypto';

/**
 * Analytics must not receive raw promo codes — irreversible fingerprint only.
 */
export function hashPromoCodeForAnalytics(code: string): string {
	return createHash('sha256').update(code, 'utf8').digest('hex').slice(0, 16);
}
