import { clientEnv } from '@/env/client';

// Leading slash is normalized so callers can pass either `images/x.webp` or
// `/images/x.webp` without producing a double slash or missing one. The CDN
// base URL is validated to never end in `/` (see `@/env/client`), so a single
// leading slash on the path always yields a well-formed URL.
const LEADING_SLASH_RE = /^\/+/;

/**
 * Resolve a static asset path against the media CDN base URL.
 *
 * Used for marketing illustrations, press shots, and other build-time-known
 * static assets that were previously bundled under `public/`. Origin-served
 * assets that must stay co-located with the deployment (PWA manifest icons,
 * App Router icon conventions, self-hosted fonts) should NOT use this helper.
 *
 * @param path - Asset path relative to the CDN root (e.g. `images/x.webp`).
 * @returns Absolute CDN URL safe to pass to `next/image` `src`.
 */
export function cdnUrl(path: string): string {
	const normalized = path.replace(LEADING_SLASH_RE, '');
	return `${clientEnv.NEXT_PUBLIC_CDN_URL}/${normalized}`;
}
