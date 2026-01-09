import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading State for Raffle Detail Page
 *
 * Displays a skeleton loading UI that matches the structure of the RaffleDetailPage.
 * Used by React Suspense while the raffle data is being fetched.
 */
export default function Loading() {
	/**
	 * Helper to generate an array of numbers for iteration
	 * @param length - The length of the array
	 * @returns Array of numbers from 0 to length - 1
	 */
	function range(length: number): number[] {
		return Array.from({ length }, (_, i) => i);
	}

	return (
		<div className="container mx-auto max-w-4xl px-4 py-8">
			<div className="flex w-full flex-col gap-6 overflow-hidden rounded-2xl bg-white p-6">
				{/* Title */}
				<Skeleton className="h-10 w-3/4" />

				<div className="flex flex-col gap-4">
					{/* Main Image */}
					<Skeleton className="aspect-video w-full rounded-lg" />

					{/* Gallery Grid */}
					<div className="grid grid-cols-3 gap-4">
						{range(3).map(i => (
							<Skeleton key={i} className="aspect-square w-full rounded-lg" />
						))}
					</div>
				</div>

				{/* Author Info */}
				<div className="flex items-center gap-4">
					<Skeleton className="size-12 rounded-full" />
					<div className="flex flex-col gap-2">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-3 w-16" />
					</div>
				</div>

				{/* Description */}
				<div className="flex flex-col gap-2">
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-20 w-full" />
				</div>

				{/* Category Tag */}
				<Skeleton className="h-8 w-24 rounded-2xl" />

				{/* Buy Button */}
				<Skeleton className="h-10 w-full lg:w-32" />
			</div>
		</div>
	);
}
