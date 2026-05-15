import type { ComponentProps } from 'react';

/**
 * Decorative cluster — three large rotated rounded-square paths in the
 * brand sky / mint / yellow palette. Path geometry is copied verbatim
 * from the browse-page `ColoredShapes` (top-left anchor): each card's
 * centre sits OFF the viewBox's left/top edges so the SVG's default
 * `overflow: hidden` crops every card to a visible "tail" hanging into
 * the corner.
 *
 * The caller is expected to flip the SVG horizontally (`-scale-x-100`)
 * and anchor it `top-0 right-0`, mirroring the browse cluster to the
 * top-right of the landing hero.
 *
 * Fills use brand-palette CSS vars (DESIGN.md / tailwind-v4 rules) so
 * a palette tweak in `globals.css` flows through automatically.
 *
 * @returns SVG cluster — caller positions absolutely + flips
 *   horizontally on a parent with `overflow-hidden`
 */
export function HeroDecorTopRight(props: ComponentProps<'svg'>) {
	return (
		<svg
			width="851"
			height="559"
			viewBox="0 0 851 559"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden
			{...props}
		>
			<path
				d="M-243.831 -72.0817C-240.401 -84.8849 -227.241 -92.4829 -214.437 -89.0523L259.373 37.9049C272.176 41.3355 279.774 54.4956 276.344 67.2988L149.387 541.109C145.956 553.913 132.796 561.511 119.993 558.08L-353.818 431.123C-366.621 427.692 -374.219 414.532 -370.788 401.729L-243.831 -72.0817Z"
				fill="var(--color-brand-sky)"
			/>
			<path
				d="M29.0231 -362.816C34.7295 -374.779 49.0539 -379.852 61.0174 -374.145L624.656 -105.298C636.62 -99.5917 641.692 -85.2673 635.986 -73.3037L367.139 490.335C361.432 502.299 347.108 507.371 335.144 501.665L-228.495 232.817C-240.458 227.111 -245.531 212.787 -239.824 200.823L29.0231 -362.816Z"
				fill="var(--color-brand-mint)"
			/>
			<path
				d="M135.361 -172.953C128.734 -184.432 132.667 -199.11 144.146 -205.738L568.953 -451C580.432 -457.627 595.11 -453.694 601.738 -442.215L847 -17.4084C853.627 -5.92936 849.694 8.74883 838.215 15.3762L413.408 260.639C401.929 267.266 387.251 263.333 380.624 251.854L135.361 -172.953Z"
				fill="var(--color-brand-yellow)"
			/>
		</svg>
	);
}
