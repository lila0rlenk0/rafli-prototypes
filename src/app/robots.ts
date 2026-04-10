import type { MetadataRoute } from 'next';

/**
 * Generates /robots.txt at build time.
 *
 * Without this file, requests to /robots.txt fall through to the root layout
 * and trigger a streaming tree mismatch ("Expected div but got
 * __next_metadata_boundary__") because Next.js tries to render the full HTML
 * shell for a route that should return plain text.
 *
 * @returns robots.txt directives allowing all crawlers
 */
export default function robots(): MetadataRoute.Robots {
	return {
		rules: { userAgent: '*', allow: '/' },
		sitemap: 'https://www.rafli.win/sitemap.xml',
	};
}
