'use client';

import { useId } from 'react';

/**
 * Credit-code redemption modal decor — two mirrored "lottery card" clusters
 * bleeding off the top-left and top-right corners of the success dialog.
 *
 * Geometry shared with `CancellationDecor` (same Figma export, same path
 * commands) so the two surfaces read as members of the same family. Only
 * the fill palette differs: where the cancellation flow leans on a
 * loss-framed red/pink/yellow, the redemption flow uses the on-brand
 * sky / mint / yellow trio so the moment feels celebratory.
 *
 * Colour mapping:
 *   - back card  → `#c4edff` (`--color-brand-sky`)
 *   - middle card → `#beffdb` (`--color-brand-mint`)
 *   - front card  → `#f6ff8b` (`--color-brand-yellow`)
 *
 * Hex literals (not Tailwind utilities) because SVG `fill` cannot reference
 * Tailwind colour tokens directly — the values are pinned to the exact
 * `@theme inline` brand definitions in `src/app/globals.css`. If those
 * tokens move, update both surfaces in lock-step.
 *
 * Why a `<mask>` is preserved here even though the dialog already clips:
 * the SVG renders edge-to-edge at the dialog's full width, but its viewBox
 * height (475) is shorter than the dialog body. Without the mask, the
 * cards on the right cluster would visually trail past the SVG's lower
 * edge — the mask preserves the rounded-rectangle "card" silhouette the
 * Figma frame uses as the modal's container shape, so the trim is correct
 * even if a future caller drops the dialog's `overflow-hidden`.
 *
 * Why `useId()` for the mask name:
 * SVG `id` references are document-global. If the dialog ever re-mounts
 * mid-animation, two copies could share the same id and the second one
 * would reference whichever element the browser parsed last. `useId()`
 * gives each instance a stable, collision-proof id without breaking
 * server/client hydration parity.
 *
 * Stacking + interaction:
 * - `pointer-events-none` lets clicks fall through to the modal body.
 * - Caller positions this absolutely behind the modal content; the icon
 *   and text below sit on top in the normal flow.
 *
 * @returns Decorative card-collage SVG sized to fill the modal width.
 */
export function RedemptionDecor() {
	// React 18+ stable id — survives Suspense / streaming and matches on
	// the server render so the mask reference doesn't dangle on hydrate.
	const maskId = useId();

	return (
		<svg
			aria-hidden
			viewBox="0 0 828 475"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			// Negative offsets cancel `<DialogContent>`'s `p-6` so the decor
			// reaches the modal's rounded edge. `-inset-x-6` sets both
			// `left:-1.5rem` and `right:-1.5rem` — combined with absolute
			// positioning the element implicitly spans `100% + 3rem`, so no
			// explicit width utility is needed (and arbitrary `w-[calc(...)]`
			// would violate the local design-token rule).
			className="pointer-events-none absolute -inset-x-6 -top-6 block h-auto select-none"
		>
			<mask
				id={maskId}
				// `mask-type: alpha` makes the rgba alpha channel of the mask
				// shapes drive coverage (rather than the default `luminance`
				// which would treat colour darkness as opacity). React's SVG
				// types omit a `maskType` prop, so we set the equivalent CSS
				// property via Tailwind's arbitrary-property syntax — the
				// browser applies `mask-type: alpha` to the `<mask>` element
				// the same way the SVG attribute would.
				className="[mask-type:alpha]"
				maskUnits="userSpaceOnUse"
				x="0"
				y="0"
				width="828"
				height="475"
			>
				{/* Card silhouette — the rounded rectangle the original
				    Figma export uses as a clip surface. Cards inside the
				    masked group only paint where this rectangle is opaque. */}
				<rect width="828" height="475" rx="24" fill="white" />
				<rect
					x="0.5"
					y="0.5"
					width="827"
					height="474"
					rx="23.5"
					stroke="#0F0F0F"
					strokeOpacity="0.95"
				/>
			</mask>
			<g mask={`url(#${maskId})`}>
				{/* Right-corner cluster — back-to-front: brand-sky, brand-mint,
				    brand-yellow. Coordinates copied from the cancellation
				    decor (same Figma family); only the `fill` colours differ
				    so the silhouette stays consistent across the two flows. */}
				<g>
					<path
						d="M785.436 -7.64089C788.77 -7.67287 791.503 -4.98702 791.538 -1.6419L792.558 93.7951C792.594 97.1403 789.92 99.8779 786.585 99.9099L691.447 100.822C688.112 100.854 685.38 98.1682 685.344 94.8231L684.325 -0.613927C684.289 -3.95905 686.963 -6.69673 690.298 -6.72871L785.436 -7.64089Z"
						fill="#C4EDFF"
					/>
					<path
						d="M855.825 29.0655C859.111 29.6437 861.31 32.7835 860.737 36.0784L839.823 156.433C839.25 159.728 836.123 161.931 832.837 161.353L712.834 140.233C709.548 139.655 707.349 136.515 707.922 133.22L728.836 12.8649C729.409 9.56997 732.536 7.36761 735.822 7.9458L855.825 29.0655Z"
						fill="#BEFFDB"
					/>
					<path
						d="M825.477 60.8112C827.81 58.4232 831.633 58.3866 834.016 60.7293L902.01 127.569C904.393 129.911 904.434 133.746 902.101 136.134L835.55 204.263C833.217 206.651 829.394 206.688 827.011 204.345L759.017 137.506C756.634 135.163 756.593 131.328 758.926 128.94L825.477 60.8112Z"
						fill="#F6FF8B"
					/>
				</g>
				{/* Left-corner cluster — mirror layout. */}
				<g>
					<path
						d="M62.1082 -8.90164C58.7735 -8.93361 56.0413 -6.24777 56.0056 -2.90264L54.9858 92.5344C54.95 95.8795 57.6243 98.6172 60.959 98.6492L156.097 99.5614C159.432 99.5933 162.164 96.9075 162.2 93.5624L163.219 -1.87467C163.255 -5.21979 160.581 -7.95748 157.246 -7.98945L62.1082 -8.90164Z"
						fill="#C4EDFF"
					/>
					<path
						d="M-8.28128 27.8047C-11.5666 28.3829 -13.7657 31.5227 -13.1931 34.8176L7.72135 155.173C8.29392 158.468 11.4214 160.67 14.7067 160.092L134.71 138.972C137.996 138.394 140.195 135.254 139.622 131.959L118.708 11.6042C118.135 8.30923 115.008 6.10687 111.723 6.68506L-8.28128 27.8047Z"
						fill="#BEFFDB"
					/>
					<path
						d="M22.0668 59.5505C19.7342 57.1625 15.9112 57.1258 13.5279 59.4686L-54.4659 126.308C-56.8491 128.651 -56.8901 132.486 -54.5574 134.873L11.9943 203.003C14.3269 205.391 18.1499 205.427 20.5331 203.085L88.527 136.245C90.9102 133.903 90.9512 130.068 88.6185 127.68L22.0668 59.5505Z"
						fill="#F6FF8B"
					/>
				</g>
			</g>
		</svg>
	);
}
