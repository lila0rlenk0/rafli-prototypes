import { PressArticleAudiences } from '@/components/landing/press-release/audiences';
import { PressArticleClosing } from '@/components/landing/press-release/closing';
import { PressArticleIntro } from '@/components/landing/press-release/intro';
import { PressArticleSolution } from '@/components/landing/press-release/solution';

/**
 * Full article body — composes the four narrative halves (intro,
 * solution, audiences, closing) inside the shared reading-width
 * container so the press-release shell stays a thin navigator.
 */
export function PressArticleBody() {
	return (
		<div className="max-w-reading-md mx-auto px-6 py-20 sm:px-10">
			<PressArticleIntro />
			<PressArticleSolution />
			<PressArticleAudiences />
			<PressArticleClosing />
		</div>
	);
}
