import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

/**
 * Scoped 404 for the authenticated shell.
 *
 * The parent `(protected)` layout already renders the signed-in `Navbar`.
 * Delegating to the root `app/not-found.tsx` here produces a double
 * navbar (root 404 renders its own minimal chrome, parent layout stacks
 * on top) — visible on every `notFound()` called from an authenticated
 * segment (e.g. a forbidden chat conversation folded into `notFound()`
 * in `messages/[conversationId]/page.tsx`).
 *
 * This boundary keeps the single protected navbar and centers the 404
 * block in the remaining viewport. Semantic tokens only — matches the
 * inline-hex → token migration landed in commit 24be870.
 */
export default function ProtectedNotFound() {
	return (
		<div className="min-h-three-fifths-screen flex flex-col items-center justify-center gap-6 px-4 py-16 text-center md:py-24">
			<h1 className="font-clash-display text-foreground text-7xl font-bold tracking-tight sm:text-8xl md:text-9xl">
				404
			</h1>
			<p className="text-muted-foreground max-w-md text-lg">
				This page doesn&apos;t exist, has been moved, or you don&apos;t have
				access to it.
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
