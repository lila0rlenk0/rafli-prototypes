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
		<div className="container mx-auto flex max-w-6xl flex-col gap-8 px-4">
			{/* Back button */}
			<Skeleton className="h-6 w-48" />

			<div className="flex w-full flex-col gap-8 lg:flex-row">
				{/* Left Column */}
				<div className="w-full space-y-4">
					{/* Main Raffle Card */}
					<div className="flex w-full flex-col gap-6 overflow-hidden rounded-2xl bg-white p-6">
						{/* Title */}
						<Skeleton className="h-10 w-3/4" />

						{/* Author Info */}
						<div className="flex items-center gap-4">
							<Skeleton className="size-12 rounded-full" />
							<div className="flex flex-col gap-2">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-3 w-16" />
							</div>
						</div>

						{/* Images */}
						<div className="flex flex-col gap-4">
							{/* Main Image */}
							<Skeleton className="aspect-video max-h-96 w-full rounded-lg" />

							{/* Gallery Grid */}
							<div className="grid grid-cols-3 gap-4">
								{range(3).map(i => (
									<Skeleton
										key={i}
										className="aspect-square max-h-32 w-full rounded-lg"
									/>
								))}
							</div>
						</div>

						{/* Description */}
						<div className="flex flex-col gap-2">
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-20 w-full" />
						</div>

						{/* Category Tag */}
						<Skeleton className="h-8 w-24 rounded-2xl" />
					</div>

					{/* FAQ Card */}
					<div className="flex w-full flex-col gap-4 overflow-hidden rounded-2xl bg-white p-6">
						<Skeleton className="h-7 w-16" />
						<div className="space-y-4">
							{range(2).map(i => (
								<div key={i} className="space-y-2">
									<Skeleton className="h-12 w-full rounded-lg" />
									<Skeleton className="h-16 w-full" />
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Right Column */}
				<div className="space-y-2">
					{/* Purchase Card with Countdown */}
					<div className="h-fit rounded-2xl border border-black bg-white px-4 py-8">
						{/* Fire Icon */}
						<Skeleton className="mx-auto size-12" />

						{/* Title */}
						<Skeleton className="mx-auto my-8 h-6 w-48" />

						{/* Countdown */}
						<div className="space-y-2">
							<Skeleton className="mx-auto h-8 w-32" />
							<Skeleton className="mx-auto h-4 w-24" />
						</div>

						{/* Price per ticket */}
						<div className="mt-6 space-y-4">
							<div className="flex items-center justify-between">
								<Skeleton className="h-8 w-32" />
							</div>

							{/* Ticket selector */}
							<div className="space-y-2">
								<Skeleton className="h-12 w-full" />
								<div className="flex gap-2">
									{range(3).map(i => (
										<Skeleton key={i} className="h-10 flex-1" />
									))}
								</div>
							</div>

							{/* Separator */}
							<Skeleton className="h-px w-full" />

							{/* Total price */}
							<div className="flex items-center justify-between">
								<Skeleton className="h-4 w-12" />
								<Skeleton className="h-8 w-32" />
							</div>

							{/* Buy button */}
							<Skeleton className="h-12 w-full" />
						</div>

						{/* Share buttons */}
						<div className="mt-6 flex justify-center gap-4">
							{range(2).map(i => (
								<Skeleton key={i} className="h-8 w-24" />
							))}
						</div>
					</div>

					{/* Raffle Info Card */}
					<div className="mt-8 rounded-2xl border border-black bg-white p-6">
						{/* Title */}
						<Skeleton className="mx-auto mb-6 h-6 w-32" />

						{/* Progress Section */}
						<div className="space-y-3">
							<div className="space-y-2">
								<div className="flex items-center justify-between text-sm">
									<Skeleton className="h-4 w-32" />
									<Skeleton className="h-4 w-16" />
								</div>
								<Skeleton className="h-[11px] w-full rounded-full" />
							</div>

							<div className="space-y-2">
								{/* Total Tickets */}
								<div className="flex items-center justify-between">
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-4 w-16" />
								</div>

								{/* Active Period */}
								<div className="flex items-center justify-between">
									<Skeleton className="h-4 w-28" />
									<Skeleton className="h-4 w-40" />
								</div>
							</div>
						</div>

						{/* Separator */}
						<Skeleton className="my-4 h-px w-full" />

						{/* My Tickets Section */}
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-4 w-8" />
							</div>
							<div className="grid grid-cols-2 gap-2 md:w-84">
								{range(4).map(i => (
									<Skeleton key={i} className="h-8 w-full rounded-lg" />
								))}
							</div>
						</div>
					</div>

					{/* KYC Info */}
					<div className="flex items-center justify-center gap-2">
						<Skeleton className="size-4" />
						<Skeleton className="h-4 w-48" />
					</div>
				</div>
			</div>
		</div>
	);
}
