import type { Metadata } from 'next';
import {
	Dice5,
	EyeOff,
	FileCheck2,
	Fingerprint,
	Lock,
	Search,
	ShieldCheck,
	Sigma,
} from 'lucide-react';
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
 * structure: icon-anchored steps, short paragraphs, scannable cards, and
 * generous whitespace.
 *
 * Layout:
 * 1. Hero — one sentence
 * 2. How a winner is picked — 3 icon-led cards layering analogy + tech detail
 * 3. Privacy wall — visual split showing what's never on IPFS vs what is
 * 4. Verify your ticket — icon-chip preview + interactive verification story
 * 5. Protocol details — collapsible dev recipe + code snippets
 * 6. CTA
 *
 * Server Component — the only interactive island is <TicketVerificationStory />.
 */
export default function HowItWorksPage() {
	return (
		<div className="container mx-auto max-w-3xl px-4 py-12">
			{/* Hero — one line expectation-setter, no jargon */}
			<header className="mb-16 text-center">
				<h1 className="font-clash-display mb-4 text-4xl font-bold sm:text-5xl">
					Every Winner Is Verifiable
				</h1>
				<p className="text-muted-foreground mx-auto max-w-2xl text-lg">
					You don&apos;t have to trust us. The proof is public.
				</p>
			</header>

			{/*
			 * Core process — 3 numbered cards. Each card layers a non-tech analogy
			 * (italic subtitle) on top of the concrete technical explanation, so a
			 * reader can stop at the analogy and still "get it", or continue to the
			 * tech for the real mechanism. Previously this was split into a
			 * "sealed envelope" section plus a separate "how a winner is selected"
			 * section — merging them cuts duplication and scroll length.
			 */}
			<section className="mb-16">
				<h2 className="font-clash-display mb-6 text-2xl font-semibold">
					How a winner is picked
				</h2>
				<ol className="space-y-4">
					<ProcessStep
						number={1}
						icon={<Lock className="size-5" />}
						title="Tickets are sealed"
						analogy="Like locking a sealed envelope in a public vault."
					>
						When the raffle ends, every ticket is uploaded to{' '}
						<a
							href="https://docs.ipfs.tech/"
							target="_blank"
							rel="noopener noreferrer"
							className="text-blue-600 hover:underline"
						>
							IPFS
						</a>{' '}
						and its fingerprint is recorded on Arbitrum. From this moment on, no
						one — including us — can add, remove, or edit tickets.
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
						, together with a cryptographic proof the number wasn&apos;t
						tampered with. We can&apos;t predict it, retry it, or influence the
						outcome.
					</ProcessStep>

					<ProcessStep
						number={3}
						icon={<Sigma className="size-5" />}
						title="Math picks the winner"
						analogy="Open the envelope, apply the dice roll, read the name."
					>
						The formula is public:{' '}
						<code className="bg-muted rounded px-1.5 py-0.5 font-mono text-sm">
							(random % totalTickets) + 1
						</code>
						. Given the same random number and the same frozen ticket list,
						anyone re-runs the formula and gets the same winner.
					</ProcessStep>
				</ol>
			</section>

			{/*
			 * Privacy wall — addresses the PII tension head-on. A public ledger means
			 * anyone can verify the draw, but a public ledger must never carry
			 * personal data. The split-card visual makes the boundary tangible:
			 * left side (dashed border = "not here") = what never touches IPFS;
			 * right side (solid border = "committed") = what's actually public.
			 * The footnote explains the one-way SHA-256 commitment in plain language,
			 * which is what lets users still prove ownership without revealing identity.
			 */}
			<section className="mb-16">
				<h2 className="font-clash-display mb-2 flex items-center gap-2 text-2xl font-semibold">
					<ShieldCheck className="size-6" />
					Public proof, private identity
				</h2>
				<p className="text-muted-foreground mb-6">
					A public ledger makes the draw verifiable. A public ledger must never
					carry personal data. Here&apos;s how we split them.
				</p>

				<div className="grid gap-4 sm:grid-cols-2">
					{/*
					 * Dashed border = absence. Visually communicates "this never
					 * arrives here" without an overt red cross or error styling.
					 */}
					<div className="bg-card rounded-xl border border-dashed p-5">
						<div className="mb-3 flex items-center gap-2">
							<EyeOff className="text-muted-foreground size-5" />
							<h3 className="font-semibold">Never on IPFS</h3>
						</div>
						<ul className="text-muted-foreground space-y-1.5 text-sm">
							<li>— Your name</li>
							<li>— Your email</li>
							<li>— Payment info</li>
							<li>— Your account ID</li>
						</ul>
					</div>

					{/* Solid border = committed. These fields form the public proof. */}
					<div className="bg-card rounded-xl border p-5">
						<div className="mb-3 flex items-center gap-2">
							<Fingerprint className="size-5" />
							<h3 className="font-semibold">Public on IPFS</h3>
						</div>
						<ul className="text-muted-foreground space-y-1.5 text-sm">
							<li>— Ticket number</li>
							<li>— Ticket code</li>
							<li>— Identity commitment (one-way hash)</li>
							<li>— Timestamp</li>
						</ul>
					</div>
				</div>

				<p className="text-muted-foreground mt-4 text-sm">
					The <em>identity commitment</em> is a one-way SHA-256 hash of your
					account combined with the raffle ID. Nobody can reverse it to find
					you, but you can recompute it yourself to prove the ticket is yours.
					Because the hash is raffle-scoped, your activity also can&apos;t be
					linked across raffles.
				</p>
			</section>

			{/*
			 * Verify-yourself section — the interactive core. Icon-chip preview
			 * replaces the previous prose bullet list: each chip maps to one of the
			 * three steps the user will see after submitting, so they predict the
			 * output before typing anything (reduces abandonment when the result
			 * screen looks unfamiliar).
			 */}
			<section className="mb-16">
				<h2 className="font-clash-display mb-2 flex items-center gap-2 text-2xl font-semibold">
					<Search className="size-6" />
					Verify your ticket
				</h2>
				<p className="text-muted-foreground mb-6">
					Enter your raffle and ticket code. Here&apos;s what you&apos;ll see.
				</p>

				<div className="mb-6 grid gap-3 sm:grid-cols-3">
					<PreviewChip
						icon={<FileCheck2 className="size-5" />}
						title="Found"
						body="Your ticket inside the frozen IPFS dataset."
					/>
					<PreviewChip
						icon={<Lock className="size-5" />}
						title="Proved"
						body="Cryptographic proof it was committed before the draw."
					/>
					<PreviewChip
						icon={<Sigma className="size-5" />}
						title="Computed"
						body="The random number and formula that picked the winner."
					/>
				</div>

				<div className="bg-card rounded-xl border p-6">
					<TicketVerificationStory />
				</div>
			</section>

			{/*
			 * Developer section — collapsible via native <details> (no JS needed).
			 * Hidden by default so casual readers aren't overwhelmed; tech-curious
			 * users can open it for the 5-step independent verification recipe and
			 * two code snippets rendered via the CodeSnippet client island.
			 */}
			<section className="mb-16">
				<details className="group">
					<summary className="font-clash-display cursor-pointer list-none text-2xl font-semibold select-none">
						Protocol details
						{/* Arrow rotates when open — Tailwind group-open variant on <details> */}
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
						 * Commit-reveal protocol snippet. CodeSnippet is a Client Component
						 * (react-syntax-highlighter), so rendering it here turns this
						 * subtree into a client island — acceptable because the whole
						 * <details> is collapsed by default.
						 */}
						<div>
							<h4 className="text-foreground mb-2 font-semibold">
								Commit-reveal protocol
							</h4>
							<CodeSnippet code={COMMIT_REVEAL_CODE} language="typescript" />
						</div>

						{/* Winner formula — the exact modulo operation */}
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
	/** Short non-tech metaphor shown above the technical body */
	analogy: string;
	children: React.ReactNode;
}

/**
 * Numbered card in the "How a winner is picked" section.
 *
 * Card format: number badge + icon/title row + italic analogy subtitle + body.
 * The analogy-first structure is deliberate — non-tech readers get the mental
 * model immediately, and tech readers get the concrete mechanism one line below.
 */
function ProcessStep({
	number,
	icon,
	title,
	analogy,
	children,
}: ProcessStepProps) {
	return (
		<li className="bg-card rounded-xl border p-5">
			<div className="flex gap-4">
				<span className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold">
					{number}
				</span>
				<div className="min-w-0 flex-1">
					<h3 className="mb-1 flex items-center gap-2 font-semibold">
						{icon}
						{title}
					</h3>
					{/* Italic analogy line — intuitive mental model before the tech */}
					<p className="text-muted-foreground mb-2 text-sm italic">{analogy}</p>
					<p className="text-muted-foreground text-sm">{children}</p>
				</div>
			</div>
		</li>
	);
}

interface PreviewChipProps {
	icon: React.ReactNode;
	title: string;
	body: string;
}

/**
 * Compact icon chip used in the verify-yourself preview row.
 * Sets expectations for the 3 verification steps before the user submits —
 * scannable at a glance, avoids a prose bullet list.
 */
function PreviewChip({ icon, title, body }: PreviewChipProps) {
	return (
		<div className="bg-card flex flex-col gap-1.5 rounded-xl border p-4">
			<div className="flex items-center gap-2">
				{icon}
				<span className="text-sm font-semibold">{title}</span>
			</div>
			<p className="text-muted-foreground text-xs leading-relaxed">{body}</p>
		</div>
	);
}
