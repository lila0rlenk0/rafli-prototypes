'use client';

import { Loader2Icon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/class-names';

export type TenderRowVariant =
	| 'selected'
	| 'active'
	| 'unselected'
	| 'unavailable';

interface TenderRowProps {
	readonly variant: TenderRowVariant;
	readonly icon: ReactNode;
	readonly label: string;
	readonly badge: string;
	readonly description?: ReactNode;
	readonly isLoading?: boolean;
	readonly disabled?: boolean;
	readonly title?: string;
	readonly onClick?: () => void;
	readonly ariaLabel?: string;
}

// Pill shape via `rounded-full` so a two-line row stays an evenly-rounded
// stadium (a fixed-radius arbitrary value pinches the corners as the body
// grows). Row stretches to its parent — the picker constrains the methods
// column to `--container-tender-stack` (412px) so every row hits the
// figma-spec width without each consumer repeating the max-width.
// `disabled:cursor-not-allowed` overrides the base `cursor-pointer` on
// loading/disabled rows so the affordance matches the actual state.
const ROW_BASE =
	'flex h-auto w-full cursor-pointer items-center gap-3 rounded-full border px-4 py-3.5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed';

// Selected = brand-dark filled, the canonical action surface for this app.
// `hover:` flips to white-on-dark — same affordance the shadcn Button
// `default` variant uses, so a recommended tender reads consistent with
// every other primary CTA. The unselected border uses `ink-500` (#7b7b7b)
// to match figma gray/10 — a noticeably darker hairline than the default
// `ink-200`, so outlined rows still feel "tappable" against the white
// modal canvas.
const VARIANT_CLASSES: Record<TenderRowVariant, string> = {
	selected:
		'border-brand-dark bg-brand-dark text-white hover:bg-white hover:text-brand-dark hover:border-brand-dark',
	// `active` = the user has tapped into this tender to expand its
	// sub-options (today: Crypto's chain breakdown). Outlined like
	// `unselected` but with the brand-dark border pinned on so the row
	// visibly carries the "you are inspecting this option" affordance
	// without stealing the filled-action emphasis from `selected`.
	active: 'border-brand-dark bg-white text-brand-dark hover:border-brand-dark',
	unselected: 'border-ink-500 bg-white text-brand-dark hover:border-brand-dark',
	// Tooltip-bearing disabled stub — `disabled` attribute strips pointer
	// events at the DOM level, so the row picks up the base
	// `disabled:cursor-not-allowed` automatically. Figma uses a very light
	// gray/12 border (#eee → ink-150) and gray/11 (#b4b4b4 → ink-300) text
	// so the row reads as informational presence rather than active
	// affordance.
	unavailable: 'border-ink-150 bg-white text-ink-300',
};

// Secondary text inside the row (badge + description). Selected = on a
// dark fill, so it stays white. Unavailable = already muted via the row
// text colour. Active and unselected share the gray/11 (#b4b4b4 → ink-300)
// muted tone for tertiary detail, distinct from the brand-dark primary
// label.
const SECONDARY_TEXT_CLASSES: Record<TenderRowVariant, string> = {
	selected: 'text-white',
	active: 'text-ink-300',
	unselected: 'text-ink-300',
	unavailable: 'text-ink-300',
};

/**
 * Pill-shaped tender row used by every option inside `PaymentMethodModal`.
 *
 * Four variants:
 * - `selected` — filled brand-dark (recommended-action tender — only ever
 *   Credits in the current spec).
 * - `active` — outlined brand-dark (user tapped this option to expand its
 *   sub-options inline).
 * - `unselected` — outlined ink-500.
 * - `unavailable` — outlined ink-150 + muted text; disabled, no hover.
 *
 * Lives under `components/payment/` because every consumer is a payment-
 * domain tender button (`buy-button`, `credits-buy-button`, `crypto-buy-
 * button/visual`). The picker (in `raffle/ticket-purchase/`) imports the
 * unavailable-stub form for its disabled tender slots, which follows the
 * existing direction the picker already reaches into the payment domain
 * for tender CTAs — no reverse dependency from `payment/` back into
 * `raffle/`.
 *
 * Each row carries a leading 36px light-gray icon chip (always the same
 * fill regardless of row variant — figma puts the visual emphasis on the
 * row outline / fill, not the chip), a primary label, a speed badge in
 * the top-right (Instant / ~30 sec), and an optional description line.
 * The whole row is the click target.
 *
 * @returns Button rendering one tender row
 */
export function TenderRow({
	variant,
	icon,
	label,
	badge,
	description,
	isLoading = false,
	disabled = false,
	title,
	onClick,
	ariaLabel,
}: TenderRowProps) {
	const isInteractive = !disabled && !isLoading && variant !== 'unavailable';
	const secondaryTextClass = SECONDARY_TEXT_CLASSES[variant];

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={!isInteractive}
			title={title}
			aria-label={ariaLabel ?? label}
			className={cn(ROW_BASE, VARIANT_CLASSES[variant])}
		>
			<IconChip>{icon}</IconChip>
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<div className="flex items-center justify-between gap-2">
					<span className="text-sm font-semibold">{label}</span>
					<span
						className={cn(
							'text-3xs font-semibold tracking-wider',
							secondaryTextClass,
						)}
					>
						{isLoading ? (
							<Loader2Icon className="size-3 animate-spin" aria-hidden />
						) : (
							badge
						)}
					</span>
				</div>
				{description ? (
					<div
						className={cn('truncate text-sm font-normal', secondaryTextClass)}
					>
						{description}
					</div>
				) : null}
			</div>
		</button>
	);
}

interface IconChipProps {
	readonly children: ReactNode;
}

// Leading circular chip — fixed `size-9` (36×36) matches figma. Fill is
// pinned to `bg-ink-150` (light gray #eeeeee) with a brand-dark icon on
// every row variant — figma uses the same chip on dark Credits and
// outlined Card/Crypto alike, so we don't flip palette by parent state.
function IconChip({ children }: IconChipProps) {
	return (
		<span
			className="text-brand-dark bg-ink-150 flex size-9 shrink-0 items-center justify-center rounded-full"
			aria-hidden
		>
			{children}
		</span>
	);
}
