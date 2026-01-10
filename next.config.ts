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
		remotePatterns:
			process.env.NODE_ENV === 'development'
				? [
						{
							protocol: 'http',
							hostname: '127.0.0.1',
							port: '9800',
						},
					]
				: [new URL(env.APP_URL)],
	},
	cacheComponents: true,
};

export default nextConfig;
