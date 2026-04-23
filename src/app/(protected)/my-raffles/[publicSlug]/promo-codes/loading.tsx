import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading state for Promo Codes page
 */
export default function Loading() {
	// Step 1: Render skeleton placeholders.
	return (
		<div className="container mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-8">
			{/* Header skeleton */}
			<div className="flex flex-col gap-4">
				<Skeleton className="h-5 w-32" />
				<div>
					<Skeleton className="h-8 w-48" />
					<Skeleton className="mt-2 h-4 w-64" />
				</div>
			</div>

			{/* Content skeleton */}
			<div className="rounded-2xl bg-white p-6">
				<div className="mb-6 flex items-center justify-between">
					<Skeleton className="h-6 w-24" />
					<div className="flex gap-2">
						<Skeleton className="h-9 w-24" />
						<Skeleton className="h-9 w-32" />
					</div>
				</div>

				<div className="flex flex-col gap-4">
					{Array.from({ length: 5 }).map((_, i) => (
						<div key={i} className="flex items-center gap-4 py-3">
							<Skeleton className="h-5 w-24" />
							<Skeleton className="h-5 w-16" />
							<Skeleton className="h-5 w-20" />
							<Skeleton className="h-5 w-12" />
							<Skeleton className="h-5 w-16" />
							<Skeleton className="h-5 w-20" />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
