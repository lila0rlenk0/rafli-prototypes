import { Dice5, Lock, Sigma } from 'lucide-react';

import { ProcessStep } from '@/components/landing/how-it-works/process-step';

/**
 * "How a winner is picked" section — three numbered cards that layer a
 * non-technical analogy over the concrete mechanism (IPFS seal →
 * Chainlink VRF → modulo formula). Layout co-located so edits to the
 * narrative flow touch one file.
 */
export function HowItWorksProcessSection() {
	return (
		<section className="mb-16">
			<h2 className="font-clash-display mb-6 text-2xl font-semibold">
				How a winner is picked
			</h2>
			<ol className="flex flex-col gap-4">
				<ProcessStep
					number={1}
					icon={<Lock className="size-5" />}
					title="Entries are sealed"
					analogy="Like locking a sealed envelope in a public vault."
				>
					When the sweepstakes ends, every entry is uploaded to{' '}
					<a
						href="https://docs.ipfs.tech/"
						target="_blank"
						rel="noopener noreferrer"
						className="text-blue-600 hover:underline"
					>
						IPFS
					</a>{' '}
					and its fingerprint is recorded on Arbitrum. From this moment on, no
					one — including us — can add, remove, or edit entries.
				</ProcessStep>

				<ProcessStep
					number={2}
					icon={<Dice5 className="size-5" />}
					title="Randomness arrives"
					analogy="An independent referee rolls the dice."
				>
					A random number is delivered by{' '}
					<a
						href="https://docs.chain.link/vrf"
						target="_blank"
						rel="noopener noreferrer"
						className="text-blue-600 hover:underline"
					>
						Chainlink VRF
					</a>
					, together with a cryptographic proof the number wasn&apos;t tampered
					with. We can&apos;t predict it, retry it, or influence the outcome.
				</ProcessStep>

				<ProcessStep
					number={3}
					icon={<Sigma className="size-5" />}
					title="Math picks the winner"
					analogy="Open the envelope, apply the dice roll, read the name."
				>
					The formula is public:{' '}
					<code className="bg-muted rounded px-1.5 py-0.5 font-mono text-sm">
						(random % totalEntries) + 1
					</code>
					. Given the same random number and the same frozen entry list, anyone
					re-runs the formula and gets the same winner.
				</ProcessStep>
			</ol>
		</section>
	);
}
