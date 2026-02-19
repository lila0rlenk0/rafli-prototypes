import { env } from '@/env/server';
import type { NextConfig } from 'next';

/**
 * Detect local development by checking if backend points to localhost.
 * When local, images are served from MinIO (Encore local storage) and
 * next/image optimization is disabled to avoid private IP errors.
 */
const backendUrl = new URL(env.BACKEND_URL);
const isLocal =
	backendUrl.hostname === 'localhost' || backendUrl.hostname === '127.0.0.1';

const nextConfig: NextConfig = {
	experimental: {
		serverActions: {
			bodySizeLimit: '60mb',
		},
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
				// Encore generates dynamic S3 bucket hostnames per deploy.
				// Wildcard covers all buckets (auth-media, raffles-media, etc.)
				protocol: 'https',
				hostname: '*.s3.us-east-1.amazonaws.com',
				pathname: '/**',
			},
		],
	},
	cacheComponents: true,
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

export default nextConfig;
