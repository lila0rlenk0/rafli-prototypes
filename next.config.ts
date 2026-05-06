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

type WebpackExternals = NonNullable<
	Parameters<NonNullable<NextConfig['webpack']>>[0]['externals']
>;

function toExternalsArray(externals: WebpackExternals | undefined): unknown[] {
	if (Array.isArray(externals)) return externals;
	if (externals === undefined || externals === null) return [];
	return [externals];
}

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
			// framer-motion's barrel (`motion`, `AnimatePresence`, `useReducedMotion`
			// and friends) pulls the full animation engine by default. Turbopack
			// rewrites to subpath imports so only referenced features ship.
			'framer-motion',
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
		const existingExternals = toExternalsArray(config.externals);
		config.externals = [...existingExternals, ...wcExternals];
		return config;
	},
	cacheComponents: true,
	// External Sweepstakes hub redirects until first-party Terms / Privacy pages
	// are authored — see https://github.com/raffly/raffly-web/issues/legal-pages.
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
				destination: 'https://www.earnm.com/privacy',
				permanent: false,
			},
		];
	},
	async headers() {
		// Baseline hardening applied to every response. These are transport-layer
		// defences that sit alongside the route-level auth/authorization checks.
		// - HSTS forces HTTPS once the browser has seen a single secure response,
		//   eliminating the SSL-strip vector for repeat visitors.
		// - X-Content-Type-Options kills MIME-sniffing ("JS delivered as image")
		//   which is the classic stored-XSS escalation for user-uploaded files.
		// - X-Frame-Options + frame-ancestors close the clickjacking surface:
		//   auth, admin, and checkout flows must never be embedded in a 3P iframe.
		// - Permissions-Policy disables sensor APIs we don't use so a compromised
		//   third-party script cannot silently request camera/mic/geolocation.
		// - CSP restricts script / style / connect / frame origins to a known
		//   third-party allow-list (Cloudflare Turnstile, Stripe, Sentry tunnel,
		//   Mixpanel, WalletConnect, Fanbasis). Audit L3 (2026-05) flagged the
		//   prior `frame-ancestors 'none'`-only policy as missing the whole
		//   script/connect/frame allow-list — XSS payloads could exfiltrate
		//   captcha tokens or session cookies to any origin. The expanded
		//   directives below add an actual origin-scoping layer.
		//
		// `'unsafe-inline'` and `'unsafe-eval'` stay on script-src + style-src:
		//   Next.js currently emits inline runtime config and Turbopack /
		//   framework chunks rely on `eval()` for module evaluation. Replacing
		//   these with nonce-per-request hashing requires Next 15+ middleware
		//   plumbing that is out of scope here; treat this as the iteration
		//   step from "no CSP" to "origin-scoped CSP" and follow up on nonces.
		return [
			{
				source: '/:path*',
				headers: [
					{
						// Prevent leaking URLs with sensitive params (promo codes) via Referer
						key: 'Referrer-Policy',
						value: 'strict-origin-when-cross-origin',
					},
					{
						// Opt in to HTTPS for 2 years; include subdomains and preload list.
						// Only emitted in production — local dev runs over HTTP.
						key: 'Strict-Transport-Security',
						value: 'max-age=63072000; includeSubDomains; preload',
					},
					{
						// Block MIME sniffing on static + dynamic responses.
						key: 'X-Content-Type-Options',
						value: 'nosniff',
					},
					{
						// Legacy header for browsers that still honour it — belt and
						// braces with CSP `frame-ancestors 'none'` below.
						key: 'X-Frame-Options',
						value: 'DENY',
					},
					{
						// Disable sensor APIs we don't use. Narrow allow-list keeps
						// every third-party iframe from silently prompting the user.
						key: 'Permissions-Policy',
						value:
							'camera=(), microphone=(), geolocation=(), payment=(self), usb=(), interest-cohort=()',
					},
					{
						// Origin-scoping CSP. Per-directive rationale:
						// - default-src 'self'      — fall-through deny everything not listed.
						// - base-uri 'self'         — block injected `<base>` re-rooting URLs.
						// - object-src 'none'       — kills Flash / PDF-plugin XSS vectors.
						// - frame-ancestors 'none'  — clickjacking (preserved from prior CSP).
						// - form-action 'self'      — prevents form-hijack to attacker host.
						// - script-src              — Cloudflare Turnstile (captcha widget),
						//                             Stripe.js (payments), Vercel insights,
						//                             Mixpanel CDN.
						// - connect-src             — siteverify-ish API endpoints + WS for
						//                             WalletConnect relays + Sentry ingest
						//                             tunnel (`/monitoring` is same-origin
						//                             so 'self' covers it).
						// - frame-src               — Turnstile challenge iframe, Stripe
						//                             3DS / hooks, Fanbasis embedded checkout.
						// - img-src 'self' data: blob: https: — third-party avatars + CDN
						//                             media; tightening would break OAuth
						//                             provider profile photos.
						// - style-src 'self' 'unsafe-inline' — Next.js component styles
						//                             require inline; track migration to
						//                             nonce-based per follow-up.
						// - font-src 'self' data:   — webfont data URIs from style chunks.
						// - worker-src 'self' blob: — Sentry replay + Vercel insights workers.
						key: 'Content-Security-Policy',
						value: [
							"default-src 'self'",
							"base-uri 'self'",
							"object-src 'none'",
							"frame-ancestors 'none'",
							"form-action 'self'",
							"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://js.stripe.com https://m.stripe.network https://cdn.mxpnl.com https://*.mixpanel.com https://va.vercel-scripts.com",
							"connect-src 'self' https://challenges.cloudflare.com https://api.stripe.com https://m.stripe.network https://*.mixpanel.com https://api.mixpanel.com https://*.sentry.io https://*.ingest.sentry.io https://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.com wss://*.walletconnect.org https://*.raffly.win https://*.rafli.win https://*.encr.app",
							"frame-src 'self' https://challenges.cloudflare.com https://js.stripe.com https://hooks.stripe.com https://*.fan-basis.com https://*.fanbasis.io",
							"img-src 'self' data: blob: https:",
							"style-src 'self' 'unsafe-inline'",
							"font-src 'self' data:",
							"worker-src 'self' blob:",
							"manifest-src 'self'",
						].join('; '),
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
