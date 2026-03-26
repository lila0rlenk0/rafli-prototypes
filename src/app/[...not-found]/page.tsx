import { notFound } from 'next/navigation';

/**
 * Catch-all route for unmatched paths.
 *
 * Converts unknown routes into a regular page request that triggers
 * the closest not-found.tsx boundary through the normal rendering
 * pipeline. This ensures the 404 page streams correctly on Vercel,
 * where the special not-found rendering path can fail to resolve
 * the root layout's Suspense boundary.
 */
export default function CatchAllNotFound() {
	notFound();
}
