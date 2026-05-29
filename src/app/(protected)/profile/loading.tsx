import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for the profile page.
 *
 * Mirrors the sidebar + main-content layout from `page.tsx`:
 * left sidebar nav on md+ with a checklist of section anchors,
 * right content area with stacked section cards.
 *
 * Suspense coverage: the three parallel fetches (session, /me, verification)
 * all block first paint — this skeleton is shown until all three resolve.
 *
 * @returns Skeleton that matches the profile page's structural hierarchy
 */
export default function Loading() {
	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
			<div className="flex w-full flex-col gap-6 md:flex-row md:gap-8">
				{/* Mobile header — title + sign-out */}
				<div className="flex flex-col gap-6 md:hidden">
					<Skeleton className="h-8 w-40" />
					<Skeleton className="h-10 w-full sm:w-32" />
				</div>

				{/* Left sidebar — visible md+ */}
				<SidebarStub />

				{/* Right content sections */}
				<div className="flex min-w-0 flex-1 flex-col gap-6">
					{/* Desktop header row */}
					<div className="hidden items-center justify-between md:flex">
						<Skeleton className="h-8 w-40" />
						<Skeleton className="h-10 w-28" />
					</div>

					<SectionCardStub rows={3} />
					<SectionCardStub rows={1} />
					<SectionCardStub rows={2} />
					<SectionCardStub rows={2} />
					<SectionCardStub rows={2} />
					<SectionCardStub rows={2} />
					<SectionCardStub rows={4} />
				</div>
			</div>
		</div>
	);
}

/** Sidebar with label-row placeholders matching the SIDEBAR_ITEMS checklist. */
function SidebarStub() {
	return (
		<aside className="hidden w-56 shrink-0 md:block">
			<div className="flex flex-col gap-3 rounded-2xl bg-white p-4">
				{Array.from({ length: 7 }, (_, i) => (
					<div key={i} className="flex items-center gap-2">
						<Skeleton className="size-4 rounded-sm" />
						<Skeleton className="h-4 w-32" />
					</div>
				))}
			</div>
		</aside>
	);
}

interface SectionCardStubProps {
	/** Number of field-row skeletons to render inside the card body. */
	rows: number;
}

/** Generic section card — heading + field rows. */
function SectionCardStub({ rows }: SectionCardStubProps) {
	return (
		<div className="flex flex-col gap-4 rounded-2xl bg-white p-6">
			<Skeleton className="h-6 w-48" />
			<div className="flex flex-col gap-3">
				{Array.from({ length: rows }, (_, i) => (
					<div key={i} className="flex flex-col gap-1.5">
						<Skeleton className="h-3 w-24" />
						<Skeleton className="h-10 w-full" />
					</div>
				))}
			</div>
		</div>
	);
}
