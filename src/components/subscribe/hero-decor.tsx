import type { ComponentProps } from 'react';

/**
 * Three-color paper-cut decor cluster for the subscribe hero.
 *
 * Rendered as an inline SVG translated directly from the Figma
 * export — three rounded-rectangle paths (sky / mint / yellow) at
 * different rotations and overlapping positions. Matches the
 * `ColoredCards` pattern used by `components/auth/page-shell.tsx`
 * (same three brand colours, same path-as-shape approach), so the
 * decor vocabulary stays consistent across public surfaces.
 *
 * Why inline SVG instead of three absolutely-positioned divs (the
 * earlier `bg-brand-* rotate-*` approach): Figma's exported paths
 * already encode each shape's rotation and rounded corners via
 * bezier curves. Replicating that with CSS needs matching
 * `transform-origin` + matrix / rotate + size + offset on every
 * shape — four variables per div × three divs, all drifting from
 * the Figma source on every design revision. One `<path d="...">`
 * per shape is authoritative and survives Figma re-exports.
 *
 * Overflow:
 *   - viewBox is `0 0 606 325`, but paths extend past those bounds:
 *     sky's leftmost point is x=-65, mint's topmost is y=-154, etc.
 *     SVG's default `overflow: hidden` would clip those bleeds, so
 *     `overflow-visible` paints each path's full bounding box. The
 *     bleed is the whole point — shapes are meant to spill past
 *     the section edge and be cut visually by the sticky nav.
 *
 * Positioning (all relative to the hero section, which is
 * `position: relative`):
 *   - **Explicit `top` / `left` are required.** An abspos child with
 *     `inset: auto` uses the flex static position; on `lg:flex-row`
 *     + `lg:items-center` that vertically centers the cluster behind
 *     the copy — wrong. We pin with named utilities so placement
 *     matches design regardless of flex alignment.
 *   - Horizontal offsets scale with the hero's column math so the
 *     yellow slab lands top-left behind the eyebrow without crossing
 *     the credit card column: `sm:-left-24 md:-left-28 lg:-left-32
 *     xl:-left-36`.
 *   - Vertical offsets pull the cluster tight against the marquee
 *     edge so only the lower fringe reads inside the hero; the copy
 *     block below then sits clear of decor mass rather than under
 *     it: `sm:-top-32 md:-top-36 lg:-top-40 xl:-top-44`. The sticky
 *     nav still clips the top bleed.
 *
 * Stacking + interaction:
 *   - `-z-10` tucks the cluster behind the headline + credit card
 *     without escaping the section's stacking context.
 *   - `pointer-events-none` lets clicks fall through to the CTAs.
 *   - Hidden below `sm:` — the 606×325 cluster behind stacked copy
 *     + form would crowd the mobile layout. At sm+ the two-column
 *     hero gives it room.
 *
 * @returns Inline SVG with sky / mint / yellow rounded-rectangle
 *   paths bleeding off the hero section's top-left corner
 */
export function HeroDecor() {
	return (
		<DecorShapes
			aria-hidden
			className="pointer-events-none absolute -top-18 -left-16 -z-10 w-76 overflow-visible sm:-top-24 sm:-left-20 sm:w-96 md:-top-30 md:-left-24 md:w-116 lg:-top-36 lg:-left-28 lg:w-132 xl:-top-40 xl:-left-32 xl:w-144"
		/>
	);
}

/**
 * Figma-exported SVG containing the three decor paths.
 *
 * Kept as a separate component so the JSX `className` / `aria-hidden`
 * prop surface stays on `HeroDecor` while the path geometry (the
 * verbose part) lives below it. Props spread onto the `<svg>` root
 * so callers can override sizing or add utilities without touching
 * the path data.
 *
 * Path order matches the z-stack Figma intends: sky (back), mint
 * (middle), yellow (front). Later siblings paint on top in SVG.
 */
function DecorShapes(props: ComponentProps<'svg'>) {
	return (
		<svg
			width="606"
			height="325"
			viewBox="0 0 606 325"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M120.592 -90.6258C127.069 -96.9288 137.211 -97.0324 143.246 -90.8573L315.427 85.3192C321.462 91.4943 321.105 101.61 314.628 107.913L129.86 287.738C123.384 294.041 113.242 294.145 107.207 287.97L-64.9742 111.793C-71.0093 105.618 -70.6516 95.5025 -64.1754 89.1995L120.592 -90.6258Z"
				className="fill-brand-sky"
			/>
			<path
				d="M323.954 -153.919C331.422 -158.991 341.329 -157.249 346.083 -150.029L519.724 113.711C524.478 120.932 522.278 130.896 514.81 135.969L242.038 321.237C234.571 326.309 224.663 324.568 219.91 317.348L46.2683 53.6073C41.5145 46.387 43.7146 36.422 51.1822 31.35L323.954 -153.919Z"
				className="fill-brand-mint"
			/>
			<path
				d="M321.105 -37.8618C321.417 -46.6851 328.842 -53.9112 337.688 -54.0016L590.089 -56.5816C598.936 -56.6721 605.855 -49.5927 605.543 -40.7693L596.643 210.962C596.331 219.785 588.906 227.011 580.06 227.102L327.659 229.682C318.812 229.772 311.893 222.693 312.205 213.869L321.105 -37.8618Z"
				className="fill-brand-yellow"
			/>
		</svg>
	);
}
