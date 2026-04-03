import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for the admin verification list page.
 * Mirrors the layout of VerificationListPage: heading, filters, table rows.
 *
 * @returns Skeleton placeholder matching list page structure
 */
export default function VerificationListLoading() {
	return (
		<div className="flex flex-col gap-6">
			{/* Heading skeleton */}
			<Skeleton className="h-9 w-48" />

			{/* Filters skeleton */}
			<div className="flex gap-3">
				<Skeleton className="h-9 w-40" />
				<Skeleton className="h-9 w-48" />
			</div>

			{/* Table skeleton */}
			<div className="rounded-2xl bg-white p-6">
				{/* Table header */}
				<div className="border-border hidden border-b pb-3 md:flex md:gap-4">
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-4 w-12" />
					<Skeleton className="h-4 w-20" />
				</div>

				{/* Table rows */}
				<div className="flex flex-col gap-4 pt-4">
					{Array.from({ length: 5 }).map((_, i) => (
						<div
							key={i}
							className="border-border flex items-center gap-4 border-b pb-4 last:border-0"
						>
							<Skeleton className="h-5 w-28" />
							<Skeleton className="h-5 w-40" />
							<Skeleton className="h-5 w-16" />
							<Skeleton className="h-5 w-16" />
							<Skeleton className="h-5 w-8" />
							<Skeleton className="h-5 w-24" />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
