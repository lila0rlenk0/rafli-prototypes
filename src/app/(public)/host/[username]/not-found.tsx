import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

/**
 * Host profile 404.
 *
 * Mirrors `app/not-found.tsx` and `(protected)/not-found.tsx` so every 404
 * across the platform lands on the same display-scale "404" block. The
 * page-level RSC in `host/[username]/page.tsx` already folds
 * invalid-format usernames, backend 404s, and permission denials into
 * `notFound()` — keeping the copy generic means an external observer
 * can't distinguish those branches, closing the username-format oracle
 * flagged by security ops.
 */
export default function HostNotFound() {
	return (
		<div className="min-h-three-fifths-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
			<h1 className="font-clash-display text-foreground text-7xl font-bold tracking-tight sm:text-8xl md:text-9xl">
				404
			</h1>
			<p className="text-muted-foreground max-w-md text-lg">
				This page doesn&apos;t exist or has been moved.
			</p>
			<Button asChild variant="outline" size="lg">
				<Link href="/browse">
					<ArrowLeft />
					Back to Browse
				</Link>
			</Button>
		</div>
	);
}
