import Link from 'next/link';

import { Button } from '@/components/ui/button';

/**
 * Final landing CTA — a full-width yellow block driving sign-ups.
 *
 * Server Component. Yellow is reserved on the landing page for two surfaces:
 * the marquee banner (top) and this CTA (bottom). Bookending the page with
 * the same brand pastel gives the scroll an arrival/departure rhythm.
 *
 * @returns Yellow CTA section with headline, sub-copy, and primary action
 */
export function CTASection() {
	return (
		<section className="bg-brand-yellow border-y-brand-dark border-y">
			<div className="max-w-wide mx-auto px-6 py-20 text-center lg:px-27 lg:py-28">
				<h2 className="font-clash-display text-brand-dark text-display-md/none lg:text-display-lg mb-5 font-semibold tracking-tight">
					Ready to enter?
				</h2>
				<p className="text-brand-dark/75 text-body-lg mx-auto mb-10 max-w-prose font-medium">
					Real prizes. Verified draws. Open to everyone.
				</p>
				<Button asChild size="lg" className="h-13 px-12">
					<Link href="/sign-up">Open the app</Link>
				</Button>
			</div>
		</section>
	);
}
