import { withSentryConfig } from '@sentry/nextjs';

import { env } from '@/env/server';
import type { NextConfig } from 'next';

/**
 * Detect local development by checking if backend points to localhost.
 * When local, images are served from MinIO (Encore local storage) and
 * next/image optimization is disabled to avoid private IP errors.
 */
const backendUrl = env.BACKEND_URL ? new URL(env.BACKEND_URL) : null;
const isLocal =
	backendUrl?.hostname === 'localhost' || backendUrl?.hostname === '127.0.0.1';

const nextConfig: NextConfig = {
	experimental: {
		serverActions: {
			bodySizeLimit: '60mb',
		},
		// Auto-transform barrel imports into direct subpath imports at build time.
		// Without this, `import { Icon } from 'lucide-react'` loads every icon (~1MB).
		// See: https://vercel.com/blog/how-we-optimized-package-imports-in-next-js
		optimizePackageImports: ['lucide-react', 'react-icons', 'lodash'],
	},
	images: {
		unoptimized: isLocal,
		// AVIF compresses ~20% smaller than WebP at equal quality.
		// Vercel auto-negotiates via Accept header — AVIF for supported browsers, WebP fallback.
		// First AVIF encode is ~50% slower, but Vercel caches the result on its CDN.
		formats: ['image/avif', 'image/webp'],
		// Backend now serves permanent (non-presigned) S3 URLs — safe to cache aggressively.
		// Without this, Vercel respects upstream Cache-Control which S3 often sets very low,
		// causing unnecessary re-optimizations and higher image transformation costs.
		minimumCacheTTL: 86_400,
		remotePatterns: [
			{
				// Primary CDN — raffly.win subdomains (e.g. cdn.raffly.win).
				protocol: 'https',
				hostname: '*.raffly.win',
				pathname: '/**',
			},
			{
				// Primary CDN — rafli.win subdomains (e.g. cdn.rafli.win).
				protocol: 'https',
				hostname: '*.rafli.win',
				pathname: '/**',
			},
			{
				// CloudFront CDN in front of S3 media buckets.
				// Wildcard covers all distributions (varies per environment).
				protocol: 'https',
				hostname: '*.cloudfront.net',
				pathname: '/**',
			},
			{
				// Encore generates dynamic S3 bucket hostnames per deploy.
				// Wildcard covers all buckets (auth-media, raffles-media, etc.)
				protocol: 'https',
				hostname: '*.s3.us-east-1.amazonaws.com',
				pathname: '/**',
			},
			{
				// Google OAuth profile avatars — stored as raw external URLs
				// on the user record when signing in via Google.
				protocol: 'https',
				hostname: 'lh3.googleusercontent.com',
				pathname: '/**',
			},
			// Local dev: MinIO serves images on the backend port.
			// `unoptimized: isLocal` skips the optimization pipeline but Next.js 16
			// still validates hostnames against remotePatterns — without this entry
			// any <Image src="http://127.0.0.1:…"> throws at render time.
			...(isLocal
				? [
						{
							protocol: 'http' as const,
							hostname: '127.0.0.1',
							pathname: '/**',
						},
						{
							protocol: 'http' as const,
							hostname: 'localhost',
							pathname: '/**',
						},
					]
				: []),
		],
	},
	// WalletConnect's dependency tree (via @walletconnect/ethereum-provider) pulls in
	// Node.js-only modules: pino logger, LokiJS persistence, and text encoding polyfill.
	// These are never executed in the browser but webpack tries to bundle them for client
	// chunks, causing build warnings. Marking them as externals skips them entirely.
	webpack: config => {
		const wcExternals = ['pino-pretty', 'lokijs', 'encoding'];
		// webpack externals can be an array, string, function, object, or RegExp.
		// Next.js always provides an array, but preserve any existing value defensively
		// so Sentry or other wrappers don't silently lose their externals logic.
		config.externals = [
			...(Array.isArray(config.externals)
				? config.externals
				: config.externals
					? [config.externals]
					: []),
			...wcExternals,
		];
		return config;
	},
	cacheComponents: true,
	// TODO: Replace these external redirects with dedicated pages once we have
	// our own Terms of Service and Privacy Policy content.
	async redirects() {
		return [
			{
				source: '/terms',
				destination: 'https://www.earnm.com/terms',
				permanent: false,
			},
			{
				source: '/policy',
				destination: 'https://www.earnm.com/earnm-privacy-policy',
				permanent: false,
			},
		];
	},
	async headers() {
		return [
			{
				source: '/:path*',
				headers: [
					{
						// Prevent leaking URLs with sensitive params (promo codes) via Referer
						key: 'Referrer-Policy',
						value: 'strict-origin-when-cross-origin',
					},
				],
			},
		];
	},
};

// TODO: Configure SENTRY_ORG, SENTRY_PROJECT, and SENTRY_AUTH_TOKEN env vars
// before merging. Source map uploads won't work until these are set.
export default withSentryConfig(nextConfig, {
	org: process.env.SENTRY_ORG,
	project: process.env.SENTRY_PROJECT,
	authToken: process.env.SENTRY_AUTH_TOKEN,

	// Disable Sentry SDK telemetry
	telemetry: false,

	// Silence source map upload warnings when env vars are not set (local dev)
	silent: !process.env.SENTRY_AUTH_TOKEN,
});
