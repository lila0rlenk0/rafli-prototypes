/**
 * Loading state for verify page
 */
export default function VerifyLoading() {
	return (
		<div className="container mx-auto max-w-4xl px-4 py-12">
			<div className="mb-12 text-center">
				<div className="mx-auto mb-4 size-16 animate-pulse rounded-full bg-neutral-200" />
				<div className="mx-auto mb-3 h-12 w-64 animate-pulse rounded bg-neutral-200" />
				<div className="mx-auto h-6 w-96 animate-pulse rounded bg-neutral-100" />
			</div>

			<div className="grid gap-6 md:grid-cols-2">
				<div className="h-80 animate-pulse rounded-2xl border border-neutral-200 bg-neutral-100" />
				<div className="h-80 animate-pulse rounded-2xl border border-neutral-200 bg-neutral-100" />
			</div>
		</div>
	);
}
