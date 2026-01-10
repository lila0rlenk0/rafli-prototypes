import { env } from '@/env/server';
import type { NextConfig } from 'next';

type Protocol = 'https' | 'http';

const storageUrl = new URL(env.STORAGE_MEDIA_URL);

const nextConfig: NextConfig = {
	experimental: {
		serverActions: {
			bodySizeLimit: '60mb',
		},
	},
	images: {
		// Allow loading images from local network (fixes private IP error)
		unoptimized: process.env.NODE_ENV === 'development',
		remotePatterns: [
			{
				protocol: storageUrl.protocol.replace(':', '') as Protocol,
				hostname: storageUrl.hostname,
				pathname: '/**',
				...(storageUrl.port ? { port: storageUrl.port } : {}),
			},
		],
	},
	cacheComponents: true,
};

export default nextConfig;
