import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { ComponentProps } from 'react';

import { Logo } from '@/assets/logo';
import { Button } from '@/components/ui/button';

/**
 * Root 404 — catches truly unknown URLs that land outside any route group.
 *
 * Each route group that ships its own authenticated chrome (currently
 * `(protected)`) owns a scoped `not-found.tsx`; this file stays minimal
 * so a URL like `/does-not-exist` still gets branded chrome without
 * pulling in the protected providers or double-stacking navbars.
 *
 * Semantic tokens only (`tailwind-v4.md`): the previous revision carried
 * inline hex (`#C4EDFF`, `#BEFFDB`, `#F6FF8B`), raw scales (`text-gray-600`,
 * `border-black`), arbitrary sizes (`text-[8rem]`, `z-[15]`) and a
 * hand-rolled CTA — all replaced by the `accent-*` palette tokens,
 * Tailwind scale utilities, and the shadcn `Button` primitive.
 */
export default function NotFound() {
	return (
		<main className="bg-background relative min-h-dvh">
			<ColoredShapes className="pointer-events-none fixed top-0 left-0 z-10 origin-top-left scale-[.65]" />

			<nav className="bg-background sticky top-0 z-20 border-b">
				<div className="max-w-hero mx-auto flex h-14 w-full items-center px-4 sm:h-16 sm:px-25">
					<Link href="/browse">
						<Logo className="h-5 w-auto sm:h-6" />
					</Link>
				</div>
			</nav>

			<div className="min-h-page-dvh relative z-20 flex flex-col items-center justify-center gap-6 px-4 text-center">
				<h1 className="font-clash-display text-foreground text-7xl font-bold tracking-tight sm:text-8xl md:text-9xl">
					404
				</h1>

				<p className="text-muted-foreground max-w-md text-lg">
					This page doesn&apos;t exist or has been moved.
				</p>

				<Button asChild variant="outline" size="lg">
					<Link href="/browse">
						<ArrowLeft />
						Back to Browse
					</Link>
				</Button>
			</div>
		</main>
	);
}

/**
 * Decorative background shapes.
 *
 * Fills reference the landing-accent tokens defined in `globals.css`
 * (`--color-brand-sky / green / yellow`) via Tailwind v4's auto-generated
 * `fill-*` utilities — keeps the palette in one place so a future brand
 * refresh flips a single variable instead of every SVG.
 */
function ColoredShapes(props: ComponentProps<'svg'>) {
	return (
		<svg
			width="851"
			height="559"
			viewBox="0 0 851 559"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				className="fill-brand-sky"
				d="M-243.831 -72.0817C-240.401 -84.8849 -227.241 -92.4829 -214.437 -89.0523L259.373 37.9049C272.176 41.3355 279.774 54.4956 276.344 67.2988L149.387 541.109C145.956 553.913 132.796 561.511 119.993 558.08L-353.818 431.123C-366.621 427.692 -374.219 414.532 -370.788 401.729L-243.831 -72.0817Z"
			/>
			<path
				className="fill-brand-mint"
				d="M29.0231 -362.816C34.7295 -374.779 49.0539 -379.852 61.0174 -374.145L624.656 -105.298C636.62 -99.5917 641.692 -85.2673 635.986 -73.3037L367.139 490.335C361.432 502.299 347.108 507.371 335.144 501.665L-228.495 232.817C-240.458 227.111 -245.531 212.787 -239.824 200.823L29.0231 -362.816Z"
			/>
			<path
				className="fill-brand-yellow"
				d="M135.361 -172.953C128.734 -184.432 132.667 -199.11 144.146 -205.738L568.953 -451C580.432 -457.627 595.11 -453.694 601.738 -442.215L847 -17.4084C853.627 -5.92936 849.694 8.74883 838.215 15.3762L413.408 260.639C401.929 267.266 387.251 263.333 380.624 251.854L135.361 -172.953Z"
			/>
		</svg>
	);
}
