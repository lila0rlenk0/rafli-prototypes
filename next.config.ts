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
		optimizePackageImports: [
			'lucide-react',
			'react-icons',
			'lodash',
			'date-fns',
		],
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
	// Reown AppKit's WalletConnect transitive deps (via @reown/appkit-adapter-wagmi)
	// pull in Node.js-only modules: pino logger, LokiJS persistence, and text encoding
	// polyfill. These never execute in the browser but webpack still tries to bundle
	// them for client chunks, producing build warnings. Externals skip them entirely.
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
				source: '/',
				destination: '/browse',
				permanent: false,
			},
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

// Skip Sentry webpack wrapper in local dev — it hooks into every compilation
// cycle and adds significant HMR latency even when DSN is unset. The Sentry
// SDK still initializes via sentry.server.config.ts; only source map upload
// and build-time instrumentation are skipped.
const isDev = process.env.NODE_ENV === 'development';

export default isDev
	? nextConfig
	: withSentryConfig(nextConfig, {
			org: 'mode-mobile-t5',
			project: 'rafli',

			// CI/CD provides this via SENTRY_AUTH_TOKEN env var (org token with org:ci scope).
			// Locally this is unset — `silent` below suppresses the resulting warnings.
			authToken: process.env.SENTRY_AUTH_TOKEN,

			// Upload a wider set of client source maps — improves stack trace readability
			// for chunks that Next.js normally excludes from the default upload set.
			widenClientFileUpload: true,

			// Route client-side Sentry events through the Next.js server.
			// Bypasses ad-blockers that block requests to ingest.sentry.io.
			tunnelRoute: '/monitoring',

			// Disable Sentry SDK telemetry
			telemetry: false,

			// Remove source maps from the production bundle after uploading to Sentry.
			// Prevents exposing original source code via browser devtools.
			sourcemaps: {
				deleteSourcemapsAfterUpload: true,
			},

			webpack: {
				// Auto-instrument Vercel Cron Monitors (does not yet work with App Router route handlers)
				automaticVercelMonitors: true,

				// Tree-shake Sentry logger statements to reduce bundle size
				treeshake: {
					removeDebugLogging: true,
				},
			},

			// Silence source map upload warnings when auth token is not set (local dev)
			silent: !process.env.SENTRY_AUTH_TOKEN,
		});
