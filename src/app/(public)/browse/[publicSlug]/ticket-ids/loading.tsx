import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading state for the Ticket IDs page.
 * Displays skeleton placeholders matching the table layout.
 *
 * @returns Skeleton UI for ticket codes table
 */
export default function Loading() {
	/**
	 * Generates an array of numbers for iteration
	 *
	 * @returns Array of numbers from 0 to length - 1
	 */
	function range(length: number): number[] {
		return Array.from({ length }, (_, i) => i);
	}

	return (
		<div className="container mx-auto flex max-w-4xl flex-col gap-6 px-4">
			<Skeleton className="h-6 w-36" />

			<div className="rounded-2xl bg-white p-8">
				<Skeleton className="mb-6 h-7 w-64" />

				<div className="flex flex-col gap-0">
					{/* Table header */}
					<div className="flex gap-8 border-b border-gray-200 pb-3">
						<Skeleton className="h-4 w-8" />
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-4 w-20" />
					</div>

					{/* Table rows */}
					{range(5).map(i => (
						<div
							key={i}
							className="flex gap-8 border-b border-gray-100 py-4 last:border-0"
						>
							<Skeleton className="h-4 w-8" />
							<Skeleton className="h-4 w-40" />
							<Skeleton className="h-4 w-24" />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
