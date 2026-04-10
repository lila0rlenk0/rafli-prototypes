import type { Metadata } from 'next';
import Link from 'next/link';

import { CodeSnippet } from '@/components/ui/code-snippet';
import { TicketVerificationStory } from '@/components/verification/ticket-verification-story';

import { COMMIT_REVEAL_CODE, WINNER_FORMULA_CODE } from './code-snippets';

export const metadata: Metadata = {
	title: 'How It Works',
	description:
		'Learn how Rafli selects winners using blockchain-verified randomness and cryptographic proofs that anyone can independently verify.',
};

/**
 * How It Works Page
 *
 * Educational page explaining the provably fair verification system.
 * Designed for clarity across tech and non-tech audiences, with ADHD-friendly
 * structure: short paragraphs, numbered steps, generous whitespace.
 *
 * Server Component — the only interactive part is <TicketVerificationStory />.
 */
export default function HowItWorksPage() {
	return (
		<div className="container mx-auto max-w-3xl px-4 py-12">
			{/* Hero — single sentence sets the expectation */}
			<header className="mb-16 text-center">
				<h1 className="font-clash-display mb-4 text-4xl font-bold sm:text-5xl">
					Every Winner Is Verifiable
				</h1>
				<p className="text-muted-foreground mx-auto max-w-2xl text-lg">
					You don&apos;t need to trust us. Here&apos;s how it works.
				</p>
			</header>

			{/* Process — 3 numbered steps, max 2 sentences each */}
			<section className="mb-16">
				<h2 className="font-clash-display mb-6 text-2xl font-semibold">
					How a winner is selected
				</h2>
				<ol className="space-y-6">
					<ProcessStep number={1} title="Tickets are locked">
						When a raffle ends, every ticket is uploaded to{' '}
						<a
							href="https://docs.ipfs.tech/"
							target="_blank"
							rel="noopener noreferrer"
							className="text-blue-600 hover:underline"
						>
							IPFS
						</a>{' '}
						— a permanent, public storage network — and a fingerprint of the
						data is recorded on the blockchain. After this point, no one can
						add, remove, or change tickets.
					</ProcessStep>

					<ProcessStep number={2} title="A random number is generated">
						We request a random number from{' '}
						<a
							href="https://docs.chain.link/vrf"
							target="_blank"
							rel="noopener noreferrer"
							className="text-blue-600 hover:underline"
						>
							Chainlink VRF
						</a>
						, a service that produces provably random numbers on the blockchain.
						Nobody — including us — can predict or influence the result.
					</ProcessStep>

					<ProcessStep number={3} title="The winner is selected">
						The formula is simple and public:{' '}
						<code className="bg-muted rounded px-1.5 py-0.5 font-mono text-sm">
							(random % totalTickets) + 1
						</code>
						. Anyone can run this with the same inputs and get the same winner.
					</ProcessStep>
				</ol>
			</section>

			{/* Privacy — addresses PII concerns in 3 short paragraphs */}
			<section className="mb-16">
				<h2 className="font-clash-display mb-6 text-2xl font-semibold">
					Your privacy
				</h2>
				<div className="text-muted-foreground space-y-3">
					<p>
						Your name, email, and user ID never appear on IPFS or the
						blockchain.
					</p>
					<p>
						Each ticket uses a{' '}
						<strong className="text-foreground">cryptographic hash</strong> — a
						one-way fingerprint of your identity that can&apos;t be reversed.
						Nobody browsing the public data can see who owns which ticket.
					</p>
					<p>
						You can still prove your ticket was in the pool. Enter your ticket
						code below and we&apos;ll verify it against the committed data.
					</p>
				</div>
			</section>

			{/* Interactive verification — the core of the page */}
			<section className="mb-16">
				<h2 className="font-clash-display mb-6 text-2xl font-semibold">
					Verify your ticket
				</h2>
				<p className="text-muted-foreground mb-4">
					Enter your ticket code to see exactly what happened during the draw.
				</p>
				<div className="bg-card rounded-xl border p-6">
					<TicketVerificationStory />
				</div>
			</section>

			{/*
			 * Developer section — collapsible via native <details> (no JS needed).
			 * Provides the 5-step independent verification recipe for tech users.
			 */}
			<section className="mb-16">
				<details className="group">
					<summary className="font-clash-display cursor-pointer list-none text-2xl font-semibold select-none">
						For the tech-savvy
						{/* Arrow rotates when open — uses Tailwind group-open variant on <details> */}
						<span className="text-muted-foreground ml-2 inline-block text-base transition-transform group-open:rotate-90">
							&#9656;
						</span>
					</summary>
					<div className="text-muted-foreground mt-4 space-y-6 text-sm">
						<p>
							The full verification pipeline is open for inspection. After any
							completed raffle, you can independently reconstruct the result:
						</p>
						<ol className="list-inside list-decimal space-y-2">
							<li>
								Read the on-chain <code className="font-mono">Commitment</code>{' '}
								struct to get the manifest hash, ticket count, and winner count
							</li>
							<li>
								Convert the manifest hash to an IPFS CID and fetch the manifest
								JSON
							</li>
							<li>
								Download ticket chunks from IPFS and verify the Merkle root
								matches
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

						{/*
						 * Commit-reveal protocol — 3-phase sequence.
						 * CodeSnippet is a Client Component (react-syntax-highlighter),
						 * so rendering it here turns this subtree into a client island.
						 * Acceptable because the whole <details> is collapsed by default
						 * and only expanded by tech-curious users.
						 */}
						<div>
							<h4 className="text-foreground mb-2 font-semibold">
								Commit-Reveal Protocol
							</h4>
							<CodeSnippet code={COMMIT_REVEAL_CODE} language="typescript" />
						</div>

						{/* Winner formula — the exact modulo operation */}
						<div>
							<h4 className="text-foreground mb-2 font-semibold">
								Winner Selection Formula
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

			{/* CTA */}
			<section className="text-center">
				<p className="text-muted-foreground mb-4">
					Every winner on Rafli can be independently verified.
				</p>
				<Link
					href="/browse"
					className="bg-primary text-primary-foreground hover:bg-primary/90 inline-block rounded-full px-8 py-3 font-semibold transition-colors"
				>
					Browse Raffles
				</Link>
			</section>
		</div>
	);
}

// --- Sub-components (page-scoped) ---

interface ProcessStepProps {
	number: number;
	title: string;
	children: React.ReactNode;
}

/**
 * Numbered step in the "How a winner is selected" section.
 * Minimal UI — number badge + title + body text.
 */
function ProcessStep({ number, title, children }: ProcessStepProps) {
	return (
		<li className="flex gap-4">
			<span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold">
				{number}
			</span>
			<div>
				<h3 className="mb-1 font-semibold">{title}</h3>
				<p className="text-muted-foreground">{children}</p>
			</div>
		</li>
	);
}
