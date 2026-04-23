import { Footer } from '@/components/landing/footer';
import { Navbar } from '@/components/landing/navbar';
import { PressArticleBody } from '@/components/landing/press-release/body';
import { PressArticleHero } from '@/components/landing/press-release/hero';

/**
 * Press Release page — static blog-style article introducing Rafli.
 *
 * Follows the landing-page composition: dedicated Navbar (decoration
 * disabled), hero banner, article body, and Footer. The article narrative
 * lives in `<PressArticleBody />` so this shell stays a thin navigator.
 */
export default function PressReleasePage() {
	return (
		<div className="bg-background min-h-dvh">
			<Navbar showDecoration={false} />
			<main>
				<PressArticleHero />
				<PressArticleBody />
			</main>
			<Footer />
		</div>
	);
}
