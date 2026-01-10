import { env } from '@/env/server';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	experimental: {
		serverActions: {
			bodySizeLimit: '60mb',
		},
	},
	images: {
		// Allow loading images from local network (fixes private IP error)
		unoptimized: process.env.NODE_ENV === 'development',
		remotePatterns: [new URL(env.STORAGE_MEDIA_URL)],
	},
	cacheComponents: true,
};

export default nextConfig;
