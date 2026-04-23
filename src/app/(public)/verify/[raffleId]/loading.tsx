/**
 * Loading state for raffle verification page
 */
export default function RaffleVerificationLoading() {
	return (
		<div className="container mx-auto max-w-4xl px-4 py-12">
			<div className="mb-6 h-5 w-32 animate-pulse rounded bg-neutral-200" />

			<div className="mb-8">
				<div className="mb-2 h-10 w-64 animate-pulse rounded bg-neutral-200" />
				<div className="h-5 w-96 animate-pulse rounded bg-neutral-100" />
			</div>

			<div className="flex flex-col gap-6">
				<div className="h-24 animate-pulse rounded-2xl border border-neutral-200 bg-neutral-100" />
				<div className="h-64 animate-pulse rounded-2xl border border-neutral-200 bg-neutral-100" />
				<div className="h-48 animate-pulse rounded-2xl border border-neutral-200 bg-neutral-100" />
			</div>
		</div>
	);
}
