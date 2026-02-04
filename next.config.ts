import { env } from '@/env/server';
import type { NextConfig } from 'next';

type Protocol = 'https' | 'http';

const storageUrl = new URL(env.STORAGE_MEDIA_URL);
const isLocal = storageUrl.hostname.includes('127.0.0.1');

const userAvatarStorageUrl = new URL(env.STORAGE_MEDIA_URL_USER_AVATARS);

const remotePatterns = [storageUrl, userAvatarStorageUrl].map(url => ({
	protocol: url.protocol.replace(':', '') as Protocol,
	hostname: url.hostname,
	pathname: '/**',
	...(url.port ? { port: url.port } : {}),
}));

const nextConfig: NextConfig = {
	experimental: {
		serverActions: {
			bodySizeLimit: '60mb',
		},
	},
	images: {
		// Allow loading images from local network (fixes private IP error)
		unoptimized: isLocal,
		remotePatterns: remotePatterns,
	},
	cacheComponents: true,
	async headers() {
		return [
			{
				// Apply to all routes
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
