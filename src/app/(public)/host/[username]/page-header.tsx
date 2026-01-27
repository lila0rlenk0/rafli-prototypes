/**
 * PageHeader Component
 *
 * Displays the page title and subtitle for the host profile page.
 */
export function PageHeader() {
	return (
		<div className="mb-16 text-center">
			<h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
				Raffle Host
			</h1>
			<p className="mt-4 text-lg">View host&apos;s raffles</p>
		</div>
	);
}
