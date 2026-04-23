import Link from 'next/link';

import { CodeSnippet } from '@/components/ui-custom/code-snippet';
import {
	COMMIT_REVEAL_CODE,
	WINNER_FORMULA_CODE,
} from '@/components/landing/how-it-works/code-snippets';

/**
 * Collapsible developer section — verification recipe plus commit-reveal
 * and winner-formula snippets. Native `<details>` keeps it
 * JS-free-by-default; `<CodeSnippet>` is a client island that only
 * hydrates when the user expands the section.
 */
export function HowItWorksProtocolDetailsSection() {
	return (
		<section className="mb-16">
			<details className="group">
				<summary className="font-clash-display cursor-pointer list-none text-2xl font-semibold select-none">
					Protocol details
					<span className="text-muted-foreground ml-2 inline-block text-base transition-transform group-open:rotate-90">
						&#9656;
					</span>
				</summary>
				<div className="text-muted-foreground mt-4 flex flex-col gap-6 text-sm">
					<p>
						The full verification pipeline is open for inspection. After any
						completed sweepstakes, you can independently reconstruct the result:
					</p>
					<ol className="flex list-inside list-decimal flex-col gap-2">
						<li>
							Read the on-chain <code className="font-mono">Commitment</code>{' '}
							struct to get the manifest hash, entry count, and winner count
						</li>
						<li>
							Convert the manifest hash to an IPFS CID and fetch the manifest
							JSON
						</li>
						<li>
							Download entry chunks from IPFS and verify the Merkle root matches
						</li>
						<li>
							Read the <code className="font-mono">RandomWordsFulfilled</code>{' '}
							event to get the VRF random numbers
						</li>
						<li>
							Run the winner formula for each position and compare against the
							announced results
						</li>
					</ol>

					<div>
						<h4 className="text-foreground mb-2 font-semibold">
							Commit-reveal protocol
						</h4>
						<CodeSnippet code={COMMIT_REVEAL_CODE} language="typescript" />
					</div>

					<div>
						<h4 className="text-foreground mb-2 font-semibold">
							Winner selection formula
						</h4>
						<CodeSnippet code={WINNER_FORMULA_CODE} language="typescript" />
					</div>

					<div className="flex flex-wrap gap-4 pt-2">
						<Link href="/verify" className="text-blue-600 hover:underline">
							Verification tools &rarr;
						</Link>
						<a
							href="https://arbiscan.io/"
							target="_blank"
							rel="noopener noreferrer"
							className="text-blue-600 hover:underline"
						>
							Arbiscan &rarr;
						</a>
					</div>
				</div>
			</details>
		</section>
	);
}
