import type { Metadata } from 'next';
import { Dice5, Lock, Search, ShieldCheck, Sigma } from 'lucide-react';
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
 * Layout:
 * 1. Hero — one sentence
 * 2. Sealed envelope analogy — intuitive mental model before any jargon
 * 3. Three numbered steps — the actual process
 * 4. Privacy — why we can't show PII and how we prove eligibility instead
 * 5. Verify your ticket — interactive form with explanation of what users will see
 * 6. Tech-savvy details — collapsible
 * 7. CTA
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

			{/*
			 * Sealed envelope analogy — builds an intuitive mental model before
			 * introducing any technical terms. The three-step numbered list maps
			 * directly to the process section below so the reader already "gets it"
			 * before seeing IPFS, VRF, or modulo.
			 */}
			<section className="mb-16">
				<h2 className="font-clash-display mb-4 text-2xl font-semibold">
					The short version
				</h2>
				<div className="text-muted-foreground space-y-3">
					<p>
						Think of a{' '}
						<strong className="text-foreground">sealed envelope</strong>.
					</p>
					<ol className="list-inside list-decimal space-y-2">
						<li>
							Before the draw, we seal every ticket inside the envelope and have
							it <strong className="text-foreground">notarized</strong> —
							recorded on a public ledger that nobody can edit.
						</li>
						<li>
							An independent{' '}
							<strong className="text-foreground">third party</strong> generates
							a random number. We can&apos;t predict it, and we can&apos;t ask
							for a different one.
						</li>
						<li>
							Only then do we open the envelope and apply the random number to
							pick the winner.
						</li>
					</ol>
					<p>
						Because the envelope was sealed <em>before</em> the random number
						existed, nobody — including us — could have rigged the outcome.
					</p>
				</div>
			</section>

			{/* Process — 3 numbered steps, each maps to the envelope analogy above */}
			<section className="mb-16">
				<h2 className="font-clash-display mb-6 text-2xl font-semibold">
					How a winner is selected
				</h2>
				<ol className="space-y-6">
					<ProcessStep
						number={1}
						icon={<Lock className="size-4" />}
						title="Tickets are locked"
					>
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

					<ProcessStep
						number={2}
						icon={<Dice5 className="size-4" />}
						title="A random number is generated"
					>
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

					<ProcessStep
						number={3}
						icon={<Sigma className="size-4" />}
						title="The winner is picked by math"
					>
						The formula is public:{' '}
						<code className="bg-muted rounded px-1.5 py-0.5 font-mono text-sm">
							(random % totalTickets) + 1
						</code>
						. The random number is divided by the total ticket count, and the
						remainder points to the winning ticket. Anyone can run this and get
						the same answer.
					</ProcessStep>
				</ol>
			</section>

			{/*
			 * Privacy section — addresses the core PII tension:
			 * users want proof their ticket was in the pool, but we can't expose
			 * personal data on a public ledger. This section explains *why* we use
			 * hashes and *what* users can still verify despite the privacy wall.
			 */}
			<section className="mb-16">
				<h2 className="font-clash-display mb-4 flex items-center gap-2 text-2xl font-semibold">
					<ShieldCheck className="size-6" />
					Your privacy matters
				</h2>
				<div className="text-muted-foreground space-y-3">
					<p>
						Raffles involve real people — names, emails, payment info. We
						can&apos;t publish that on a public ledger, and you wouldn&apos;t
						want us to.
					</p>
					<p>
						Instead, each ticket is stored as a{' '}
						<strong className="text-foreground">cryptographic hash</strong> — a
						one-way fingerprint. It proves the ticket existed without revealing
						who owns it. Think of it like a sealed ballot: the ballot is in the
						box, but nobody can see whose name is on it.
					</p>
					<p>
						So how do you know <em>your</em> ticket was actually in the pool?
						That&apos;s what the verification tool below does. You enter your
						private ticket code, and we prove — using the same public data on
						IPFS — that your ticket was locked in before the draw.
					</p>
				</div>
			</section>

			{/* Interactive verification — the core of the page */}
			<section className="mb-16">
				<h2 className="font-clash-display mb-4 flex items-center gap-2 text-2xl font-semibold">
					<Search className="size-6" />
					Verify your ticket
				</h2>

				{/*
				 * Preamble — sets expectations for what the verification tool will show.
				 * Users who don't understand the output are less likely to trust it, so
				 * we preview the three things they'll see before they type anything.
				 */}
				<div className="text-muted-foreground mb-6 space-y-2 text-sm">
					<p>
						Enter your raffle and ticket code. You&apos;ll see three things:
					</p>
					<ol className="list-inside list-decimal space-y-1">
						<li>
							<strong className="text-foreground">Your ticket was found</strong>{' '}
							— it exists in the locked dataset on IPFS.
						</li>
						<li>
							<strong className="text-foreground">Cryptographic proof</strong> —
							a Merkle proof confirming your ticket was committed before any
							randomness existed.
						</li>
						<li>
							<strong className="text-foreground">The draw math</strong> — the
							exact random number, the formula, and which ticket it landed on.
							If your ticket wasn&apos;t the winner, you&apos;ll see exactly
							why: the math simply pointed to a different number.
						</li>
					</ol>
				</div>

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
	icon: React.ReactNode;
	title: string;
	children: React.ReactNode;
}

/**
 * Numbered step in the "How a winner is selected" section.
 * Number badge + icon + title + body text.
 */
function ProcessStep({ number, icon, title, children }: ProcessStepProps) {
	return (
		<li className="flex gap-4">
			<span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold">
				{number}
			</span>
			<div>
				<h3 className="mb-1 flex items-center gap-1.5 font-semibold">
					{icon}
					{title}
				</h3>
				<p className="text-muted-foreground">{children}</p>
			</div>
		</li>
	);
}
