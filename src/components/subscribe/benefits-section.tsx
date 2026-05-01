import { cdnUrl } from '@/lib/utils/cdn';
import { BenefitCard, type Benefit } from './benefit-card';

/**
 * Benefit data — four cards matching the Figma "EARLY MEMBER PERKS"
 * block. Each card has a title + two-or-three bullet items rather
 * than a single label line; the narrative walks the visitor from
 * content access to recurring earnings to monthly giveaways.
 *
 * Lives at module scope so re-renders don't re-allocate the array.
 * Illustrations are served from the media CDN (`cdn-media.raffly.win`)
 * as WebP — same source set delivered with the Figma handoff, just
 * out of the build to keep the static bundle small.
 */
const BENEFITS: readonly Benefit[] = [
	{
		image: cdnUrl('static/images/subscribe/benefit-content-portal.webp'),
		title: 'Content Portal',
		items: [
			'Unlimited access to our exclusive content portal',
			'Credit card, travel, tax, and saving strategies',
		],
	},
	{
		image: cdnUrl('static/images/subscribe/benefit-boosted-earnings.webp'),
		title: 'Boosted Earnings',
		items: [
			'Boosted earning across Mode ecosystem',
			'Earn $1,200+ /year from games, music and daily use',
		],
	},
	{
		image: cdnUrl('static/images/subscribe/benefit-free-phone.webp'),
		title: 'Free phone plan',
		items: [
			'Free Phone plan on a T Mobile-based MVNO',
			'Estimated $300+ in yearly savings',
			'Powered seamlessly by Helium under the hood',
		],
	},
	{
		image: cdnUrl('static/images/subscribe/benefit-sweepstakes.webp'),
		title: 'Sweepstakes Access',
		items: [
			'Weekly + Monthly prize pools',
			'Automatic entries for a chance to win $5,000 monthly + $300 weekly',
		],
	},
];

/**
 * "EARLY MEMBER PERKS" benefits block — four mint-green cards under a
 * three-line heading stack.
 *
 * Card row is a responsive grid (1→2→3→4 columns at base/md/lg/xl) so all
 * four benefits sit side-by-side on desktop and stack cleanly on narrower
 * viewports — matches the Figma composition that treats the row as a single
 * visual unit.
 *
 * Heading stack: uppercase eyebrow → bold Clash Display H2 → medium
 * Geist subtitle. The H2 is intentionally longer (no text-balance
 * truncation) because marketing wants the full promise on one screen.
 *
 * @returns Benefits heading stack + responsive card row/grid
 */
export function BenefitsSection() {
	return (
		<section className="flex flex-col items-center gap-10 py-16 md:gap-12 md:py-20">
			<div className="flex w-full max-w-(--container-subscribe-benefits-heading) flex-col items-center gap-3 text-center">
				<p className="text-label-sm text-ink-alpha font-medium uppercase">
					EARLY MEMBER PERKS
				</p>
				<h2 className="font-clash-display text-headline-lg text-ink-900 md:text-display-md font-semibold text-balance">
					Get more with your subscription and start strong from the very first
					day
				</h2>
				<p className="text-body-sm text-ink-alpha md:text-body-md font-medium">
					Subscribe now and start strong with all of these free member benefits
				</p>
			</div>

			{/* 4× 284px cards + 3× 32px gaps = 1,232px — the full 4-up row
			    only fits once the content rail reaches desktop width.
			    Grid steps 1→2→3→4 at base/md/lg/xl keep cards readable and
			    avoid horizontal pressure around 1024px viewports. */}
			<div className="grid w-full max-w-(--container-subscribe-benefits-row) grid-cols-1 justify-items-center gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3 xl:grid-cols-4">
				{BENEFITS.map(benefit => (
					<BenefitCard key={benefit.title} benefit={benefit} />
				))}
			</div>
		</section>
	);
}
