import type { ComponentProps } from 'react';

/**
 * Single decoration cluster — three rotated rounded rectangles in the
 * brand sky / mint / yellow palette — shared by the payment-method
 * picker (anchored to the modal bottom) and the celebration modals
 * (rotated 180° to anchor at the top so the two purchase moments
 * bookend visually).
 *
 * The path data is the Figma hand-off geometry: shapes intentionally
 * extend past the 830×743 viewBox and rely on the parent modal's
 * `overflow-hidden` + `rounded-3xl` to crop at the modal edge. That's
 * why the SVG itself sets `overflow="visible"` — the modal owns the
 * clip, not the SVG.
 *
 * Sizing strategy: callers position the SVG absolutely and pin it via
 * `w-full` so the cluster scales with the modal width. At the canonical
 * desktop frame (830px) the geometry renders pixel-accurate to Figma;
 * on the mobile fullscreen sheet it scales down uniformly without
 * extra breakpoint logic.
 *
 * Fills use brand-palette CSS vars (DESIGN.md / tailwind-v4 rules) so a
 * future palette tweak in `globals.css` flows automatically.
 *
 * @returns SVG cluster — caller is responsible for absolute positioning
 *   (e.g., `absolute bottom-0 left-0 w-full` or `rotate-180` for the
 *   top-anchored variant).
 */
export function PaymentModalDecor(props: ComponentProps<'svg'>) {
	return (
		<svg
			viewBox="0 0 830 743"
			fill="none"
			overflow="visible"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden
			{...props}
		>
			<path
				d="M796.777 906.844C793.438 919.672 780.373 927.213 767.595 923.689L544.29 862.095C531.512 858.57 523.86 845.314 527.199 832.487L587.341 601.433C590.68 588.606 603.745 581.064 616.523 584.589L839.829 646.183C852.606 649.708 860.258 662.963 856.919 675.791L796.777 906.844Z"
				fill="var(--color-brand-sky)"
			/>
			<path
				d="M911.655 732.013C906.082 744.04 891.92 749.053 880.022 743.211L700.135 654.885C688.237 649.043 683.11 634.557 688.682 622.531L774.857 436.553C780.429 424.526 794.592 419.513 806.49 425.355L986.376 513.681C998.274 519.523 1003.4 534.008 997.83 546.035L911.655 732.013Z"
				fill="var(--color-brand-mint)"
			/>
			<path
				d="M611.501 819.698C617.984 831.259 614.004 846.121 602.609 852.893L402.175 972.017C390.781 978.789 376.288 974.907 369.804 963.346L253.74 756.406C247.256 744.845 251.237 729.984 262.631 723.212L463.066 604.088C474.46 597.316 488.953 601.198 495.437 612.759L611.501 819.698Z"
				fill="var(--color-brand-yellow)"
			/>
		</svg>
	);
}
