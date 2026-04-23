import { Skeleton } from '@/components/ui/skeleton';

/**
 * Helper to generate an array of numbers for iteration.
 *
 * @param length - The length of the array
 * @returns Array of numbers from 0 to length - 1
 */
function range(length: number): number[] {
	return Array.from({ length }, (_, i) => i);
}

/**
 * Loading State for Raffle Detail Page
 *
 * Displays a skeleton loading UI that matches the structure of the RaffleDetailPage.
 * Used by React Suspense while the raffle data is being fetched.
 */
export default function Loading() {
	return (
		<div className="container mx-auto flex max-w-6xl flex-col gap-8 px-4">
			{/* Back button */}
			<Skeleton className="h-6 w-48" />

			<div className="flex w-full flex-col gap-8 lg:flex-row">
				<LeftColumn />
				<RightColumn />
			</div>
		</div>
	);
}

/** Main detail content — title, author, images, description, FAQ. */
function LeftColumn() {
	return (
		<div className="flex w-full flex-col gap-4">
			<div className="flex w-full flex-col gap-6 overflow-hidden rounded-2xl bg-white p-6">
				<Skeleton className="h-10 w-3/4" />
				<AuthorStub />
				<ImagesStub />
				<div className="flex flex-col gap-2">
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-20 w-full" />
				</div>
				<Skeleton className="h-8 w-24 rounded-2xl" />
			</div>
			<FaqStub />
		</div>
	);
}

function AuthorStub() {
	return (
		<div className="flex items-center gap-4">
			<Skeleton className="size-12 rounded-full" />
			<div className="flex flex-col gap-2">
				<Skeleton className="h-4 w-24" />
				<Skeleton className="h-3 w-16" />
			</div>
		</div>
	);
}

function ImagesStub() {
	return (
		<div className="flex flex-col gap-4">
			<Skeleton className="aspect-video max-h-96 w-full rounded-lg" />
			<div className="grid grid-cols-3 gap-4">
				{range(3).map(i => (
					<Skeleton
						key={i}
						className="aspect-square max-h-32 w-full rounded-lg"
					/>
				))}
			</div>
		</div>
	);
}

function FaqStub() {
	return (
		<div className="flex w-full flex-col gap-4 overflow-hidden rounded-2xl bg-white p-6">
			<Skeleton className="h-7 w-16" />
			<div className="flex flex-col gap-4">
				{range(2).map(i => (
					<div key={i} className="flex flex-col gap-2">
						<Skeleton className="h-12 w-full rounded-lg" />
						<Skeleton className="h-16 w-full" />
					</div>
				))}
			</div>
		</div>
	);
}

function RightColumn() {
	return (
		<div className="flex flex-col gap-2">
			<PurchaseCardStub />
			<RaffleInfoStub />
			<div className="flex items-center justify-center gap-2">
				<Skeleton className="size-4" />
				<Skeleton className="h-4 w-48" />
			</div>
		</div>
	);
}

function PurchaseCardStub() {
	return (
		<div className="h-fit rounded-2xl border border-black bg-white px-4 py-8">
			<Skeleton className="mx-auto size-12" />
			<Skeleton className="mx-auto my-8 h-6 w-48" />
			<div className="flex flex-col gap-2">
				<Skeleton className="mx-auto h-8 w-32" />
				<Skeleton className="mx-auto h-4 w-24" />
			</div>
			<div className="mt-6 flex flex-col gap-4">
				<div className="flex items-center justify-between">
					<Skeleton className="h-8 w-32" />
				</div>
				<div className="flex flex-col gap-2">
					<Skeleton className="h-12 w-full" />
					<div className="flex gap-2">
						{range(3).map(i => (
							<Skeleton key={i} className="h-10 flex-1" />
						))}
					</div>
				</div>
				<Skeleton className="h-px w-full" />
				<div className="flex items-center justify-between">
					<Skeleton className="h-4 w-12" />
					<Skeleton className="h-8 w-32" />
				</div>
				<Skeleton className="h-12 w-full" />
			</div>
			<div className="mt-6 flex justify-center gap-4">
				{range(2).map(i => (
					<Skeleton key={i} className="h-8 w-24" />
				))}
			</div>
		</div>
	);
}

function RaffleInfoStub() {
	return (
		<div className="mt-8 rounded-2xl border border-black bg-white p-6">
			<Skeleton className="mx-auto mb-6 h-6 w-32" />
			<div className="flex flex-col gap-3">
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between text-sm">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-4 w-16" />
					</div>
					<Skeleton className="h-2.75 w-full rounded-full" />
				</div>
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-4 w-16" />
					</div>
					<div className="flex items-center justify-between">
						<Skeleton className="h-4 w-28" />
						<Skeleton className="h-4 w-40" />
					</div>
				</div>
			</div>
			<Skeleton className="my-4 h-px w-full" />
			<div className="flex flex-col gap-2">
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
	);
}
