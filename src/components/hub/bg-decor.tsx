import { cn } from '@/lib/class-names';

/**
 * Decorative pastel "bg-square" blobs scattered behind the hub content.
 *
 * Mirrors the Figma board's confetti language — soft rounded squares in the
 * brand accent trio, tucked at the page corners and rotated for a hand-placed
 * feel. Purely cosmetic: `aria-hidden`, `-z-10` underlay, and `pointer-events-none`
 * so they never intercept clicks. The parent `(prototype)` layout clips the
 * horizontal overflow they create.
 *
 * @returns Absolutely-positioned cluster of accent squares
 */
export function BgDecor() {
	const squares = [
		{ className: 'bg-brand-yellow top-24 -left-10 size-40 rotate-12' },
		{ className: 'bg-brand-sky top-1/4 -right-12 size-48 -rotate-12' },
		{ className: 'bg-brand-mint top-1/2 -left-16 size-44 rotate-6' },
		{ className: 'bg-brand-yellow bottom-32 right-1/4 size-36 -rotate-6' },
		{ className: 'bg-brand-sky bottom-10 -left-8 size-40 rotate-12' },
		{ className: 'bg-brand-mint bottom-1/4 -right-10 size-44 rotate-3' },
	];

	return (
		<div
			aria-hidden
			className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
		>
			{squares.map((square, i) => (
				<span
					key={i}
					className={cn(
						'absolute rounded-3xl opacity-50 blur-sm',
						square.className,
					)}
				/>
			))}
		</div>
	);
}
