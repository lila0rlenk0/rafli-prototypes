import { Check } from 'lucide-react';
import Image from 'next/image';

/**
 * Single bullet inside a benefit card. Shape mirrors the backend's
 * `PlanFeatureDto` (`raffles-core-backend/src/payments/dto/subscription.dto.ts`)
 * so the FE can swap to a dynamic fetch from `GET /subscriptions/plans`
 * without re-shaping the data on the way in. `tag` is the highlight
 * chip (NEW / LIMITED OFFER / Only PROs) — `null` means no chip renders.
 */
export interface BenefitItem {
	readonly text: string;
	readonly tag: string | null;
}

export interface Benefit {
	/**
	 * Absolute CDN URL for the illustration (WebP). Constructed via
	 * `cdnUrl(...)` at the call site — the file lives in the media
	 * bucket under `images/subscribe/`. WebP keeps the alpha channel
	 * so the mint card shows through edges, at a fraction of PNG size.
	 */
	readonly image: string;
	readonly title: string;
	/**
	 * Bullet-list copy. One to three lines per Figma — more overflows
	 * the 544px fixed card height, fewer leaves the card feeling empty
	 * against its siblings.
	 */
	readonly items: readonly BenefitItem[];
}

interface BenefitCardProps {
	readonly benefit: Benefit;
}

/**
 * Single subscription-benefit card rendered inside the benefits grid.
 *
 * Figma spec: 284×544 mint fill, 40px corners, 1px black hairline.
 * Asymmetric padding — 54px top, 24px sides, 122px bottom — anchors
 * illustration + title + bullets to the upper half and leaves a
 * generous empty plinth underneath, which reads as negative space
 * rather than off-balance because all four sibling cards share the
 * same void.
 *
 * Title uses Geist 700 per Figma (no Clash Display here — that font
 * carries the section H2, and the card titles step down in weight
 * hierarchy by switching family rather than size).
 *
 * Fixed 284×544 on desktop so the row matches the Figma canvas; on
 * narrow viewports the fixed width drives the snap-scroll carousel.
 *
 * @param benefit - Illustration path + title + bullet list
 * @returns Mint-fill rounded card with centered illustration, title
 *   and bulleted benefit list
 */
export function BenefitCard({ benefit }: BenefitCardProps) {
	const { image, title, items } = benefit;

	return (
		<div className="bg-brand-mint border-ink-900 flex h-full w-full max-w-sm flex-col items-center gap-(--spacing-subscribe-benefit-card-gap) rounded-(--radius-subscribe-benefit-card) border px-6 pt-(--spacing-subscribe-benefit-card-pt) pb-(--spacing-subscribe-benefit-card-pb) xl:min-h-(--spacing-subscribe-benefit-card-h) xl:w-(--spacing-subscribe-benefit-card-w) xl:max-w-none">
			<div className="relative size-(--spacing-subscribe-benefit-image) shrink-0 p-2.5">
				<Image
					src={image}
					alt={title}
					fill
					className="object-contain"
					sizes="170px"
				/>
			</div>

			<p className="font-clash-display text-ink-900 text-headline-md/tight w-full max-w-(--spacing-subscribe-benefit-title) text-center font-bold text-balance">
				{title}
			</p>

			<ul className="flex w-full flex-col gap-(--spacing-subscribe-benefit-list-gap)">
				{items.map(item => (
					<li key={item.text} className="flex items-start gap-3">
						<span
							className="bg-ink-900 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg"
							aria-hidden
						>
							<Check
								className="text-on-dark size-4"
								strokeWidth={2.5}
								aria-hidden
							/>
						</span>
						<span className="text-body-sm text-ink-alpha flex flex-wrap items-center gap-1.5 font-medium">
							{item.tag === null ? null : <BenefitTag label={item.tag} />}
							<span>{item.text}</span>
						</span>
					</li>
				))}
			</ul>
		</div>
	);
}

interface BenefitTagProps {
	readonly label: string;
}

/**
 * Highlight chip rendered before a benefit bullet (NEW / LIMITED OFFER /
 * Only PROs). Matches the backend's `PlanFeatureDto.tag` field — chip
 * styling is intentionally neutral (brand-dark fill, yellow ink) so the
 * three tag variants share one visual language and a future fourth tag
 * drops in without a color-mapping table.
 */
function BenefitTag({ label }: BenefitTagProps) {
	return (
		<span className="bg-ink-900 text-brand-yellow tracking-caps-2 text-3xs rounded-sm px-1.5 py-0.5 font-semibold whitespace-nowrap uppercase">
			{label}
		</span>
	);
}
