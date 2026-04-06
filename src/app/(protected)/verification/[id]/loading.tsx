import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for the user submission detail page.
 * Mirrors the card-based layout: header, form data, documents.
 *
 * @returns Skeleton placeholder matching detail page structure
 */
export default function SubmissionDetailLoading() {
	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">
			{/* Back link skeleton */}
			<Skeleton className="h-5 w-36" />

			{/* Header card */}
			<div className="rounded-2xl bg-white p-8">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="flex flex-col gap-2">
						<Skeleton className="h-9 w-48" />
						<Skeleton className="h-4 w-36" />
					</div>
					<Skeleton className="h-6 w-16 rounded-full" />
				</div>
				<div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<div key={i} className="flex flex-col gap-1">
							<Skeleton className="h-4 w-16" />
							<Skeleton className="h-5 w-28" />
						</div>
					))}
				</div>
			</div>

			{/* Form data card */}
			<div className="rounded-2xl bg-white p-8">
				<Skeleton className="mb-5 h-7 w-40" />
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					{Array.from({ length: 6 }).map((_, i) => (
						<div key={i} className="flex flex-col gap-1">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-5 w-40" />
						</div>
					))}
				</div>
			</div>

			{/* Documents card */}
			<div className="rounded-2xl bg-white p-8">
				<Skeleton className="mb-5 h-7 w-28" />
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					{Array.from({ length: 2 }).map((_, i) => (
						<Skeleton key={i} className="aspect-[4/3] w-full rounded-lg" />
					))}
				</div>
			</div>
		</div>
	);
}
