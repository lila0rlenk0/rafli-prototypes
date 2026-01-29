'use client';

import {
	CheckCircle2,
	ChevronDown,
	Database,
	Dice5,
	FileCheck,
	Link2,
	Lock,
	Mail,
	Search,
	Shield,
	TreeDeciduous,
	X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';

import { DeepDive } from '@/components/raffle/deep-dive';
import { CodeBlock } from '@/components/ui/code-block';
import { ComparisonDiagram } from '@/components/ui/comparison-diagram';
import { ProtocolDiagram } from '@/components/ui/protocol-diagram';
import { ScrollReveal, ScrollRevealStagger } from '@/components/ui/scroll-reveal';
import { TicketChecker } from '@/components/verification/ticket-checker';

// ==========================================
// Code Snippets
// ==========================================

const COMMIT_REVEAL_CODE = `// Commit-Reveal Protocol
// Step 1: Before random number exists
const ticketManifest = buildManifest(allTickets);
const commitHash = sha256(ticketManifest);
await blockchain.commit(commitHash); // Locked forever

// Step 2: Random number generated (can't be influenced)
const randomNumber = await chainlinkVRF.getRandomNumber();

// Step 3: Apply random to committed data
const winner = selectWinner(ticketManifest, randomNumber);
// Manipulation impossible: data locked before randomness`;

const WINNER_FORMULA_CODE = `// Winner Selection Formula
const randomNumber = BigInt("0x7a3b9c2d...4f2c1e8a");
const totalTickets = 12_847n;

// Simple modulo operation
const winningIndex = Number(randomNumber % totalTickets);
const winningTicket = winningIndex + 1;

// Result: Ticket #8432 wins
// Anyone can verify: (random % 12847) + 1 = 8432`;

const MERKLE_CODE = `// Merkle Tree Verification
const ticketHash = sha256(\`\${ticketId}|\${ticketCode}|\${participantId}\`);

// Verify ticket was committed before draw
const isValid = verifyMerkleProof(
  ticketHash,    // Your ticket's hash
  proof,         // Path from ticket to root
  merkleRoot     // Root stored on blockchain
);

// true = ticket existed in committed set`;

const VRF_CODE = `// Chainlink VRF (Verifiable Random Function)
// Random number from blockchain, not Raffly servers

const vrfResponse = await chainlink.requestRandomWords({
  keyHash: "0x...",      // Public verification key
  subscriptionId: 123,
  requestConfirmations: 3,
  numWords: 1
});

// Output is cryptographically tied to block data
// Raffly cannot predict or influence the result`;

const IPFS_CODE = `// IPFS Content Addressing
const manifest = JSON.stringify({
  raffleId: "raffle_abc123",
  totalTickets: 12847,
  tickets: [...],
  createdAt: "2024-01-15T10:30:00Z"
});

const ipfsHash = await ipfs.add(manifest);
// Returns: "QmX4z...8Yk" (content-addressed hash)

// Same data = same hash, always
// Change 1 byte = completely different hash`;

const ARBITRUM_CODE = `// Arbitrum One - L2 Blockchain
// Fast, cheap transactions with Ethereum security

const tx = await arbitrumContract.commit({
  raffleId: "raffle_abc123",
  merkleRoot: "0x123...789",
  ipfsHash: "QmX4z...8Yk",
  timestamp: Date.now()
});

// Transaction hash becomes permanent proof
// Viewable on Arbiscan by anyone`;

// ==========================================
// Technology Data
// ==========================================

const TECHNOLOGIES = [
	{
		id: 'ipfs',
		icon: Database,
		title: 'IPFS',
		color: 'purple',
		description: 'Ticket data stored on a global, permanent network. Once uploaded, data cannot be changed.',
		analogy: 'Like publishing in a newspaper—everyone can see it, and you can\'t rewrite history.',
		code: IPFS_CODE,
		links: [{ label: 'IPFS Docs', href: 'https://docs.ipfs.tech/' }],
	},
	{
		id: 'vrf',
		icon: Dice5,
		title: 'Chainlink VRF',
		color: 'blue',
		description: 'Random numbers from Chainlink\'s Verifiable Random Function on the blockchain.',
		analogy: 'Like a third-party auditor rolling dice that even the casino can\'t control.',
		code: VRF_CODE,
		links: [{ label: 'VRF Docs', href: 'https://docs.chain.link/vrf' }],
	},
	{
		id: 'merkle',
		icon: TreeDeciduous,
		title: 'Merkle Tree',
		color: 'green',
		description: 'All tickets organized in a structure that creates a unique fingerprint for the entire dataset.',
		analogy: 'Like a family tree where changing one ancestor would change everyone\'s DNA.',
		code: MERKLE_CODE,
		links: [],
	},
	{
		id: 'arbitrum',
		icon: Link2,
		title: 'Arbitrum One',
		color: 'orange',
		description: 'Ethereum L2 for fast, cheap commits with full security. All proofs permanently recorded.',
		analogy: 'Like a notary that never sleeps and can\'t be bribed.',
		code: ARBITRUM_CODE,
		links: [{ label: 'Arbiscan', href: 'https://arbiscan.io/' }],
	},
] as const;

const COLOR_CLASSES = {
	purple: { icon: 'text-purple-600', border: 'border-purple-200', bg: 'bg-purple-50', ring: 'ring-purple-500' },
	blue: { icon: 'text-blue-600', border: 'border-blue-200', bg: 'bg-blue-50', ring: 'ring-blue-500' },
	green: { icon: 'text-green-600', border: 'border-green-200', bg: 'bg-green-50', ring: 'ring-green-500' },
	orange: { icon: 'text-orange-600', border: 'border-orange-200', bg: 'bg-orange-50', ring: 'ring-orange-500' },
} as const;

/**
 * How It Works Page
 *
 * Educational page explaining the provably fair verification system
 * with progressive disclosure for technical users.
 */
export default function HowItWorksPage() {
	const [selectedTech, setSelectedTech] = useState<string | null>(null);

	/**
	 * Handles technology card selection
	 */
	function handleTechSelect(id: string) {
		setSelectedTech(selectedTech === id ? null : id);
	}

	return (
		<div className="container mx-auto max-w-4xl px-4 py-12">
			{/* Hero */}
			<ScrollReveal>
				<header className="mb-16 text-center">
					<h1 className="font-clash-display mb-4 text-4xl font-bold sm:text-5xl">
						Every Winner Verifiable
					</h1>
					<p className="mx-auto max-w-2xl text-lg text-gray-600">
						No trust required. Every raffle result can be independently verified
						using cryptographic proofs.
					</p>
				</header>
			</ScrollReveal>

			{/* The Problem - Visual Comparison */}
			<ScrollReveal>
				<section className="mb-16">
					<h2 className="mb-6 text-2xl font-semibold">
						Traditional vs Provably Fair
					</h2>
					<ComparisonDiagram />
				</section>
			</ScrollReveal>

			{/* 30-Second Explainer */}
			<ScrollReveal>
				<section className="mb-16">
					<h2 className="mb-6 text-2xl font-semibold">
						The 30-Second Explanation
					</h2>
					<div className="rounded-xl border bg-gradient-to-br from-neutral-50 to-white p-6">
						<div className="flex flex-col items-center gap-6 md:flex-row">
							{/* Envelope icon */}
							<div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-amber-100">
								<Mail className="size-10 text-amber-600" />
							</div>
							<div>
								<p className="mb-3 text-gray-700">
									Think of a <strong>sealed envelope</strong>:
								</p>
								<ol className="list-inside list-decimal space-y-2 text-gray-700">
									<li>
										Before the draw, we seal all ticket data in an envelope and
										have it <strong>notarized</strong> (blockchain commit)
									</li>
									<li>
										A <strong>third party</strong> generates the random number
										(Chainlink VRF)
									</li>
									<li>
										Only then do we open the envelope and apply the random
										number to pick the winner
									</li>
								</ol>
								<p className="mt-3 text-sm text-gray-500">
									Because the envelope was sealed <em>before</em> the random
									number existed, manipulation is mathematically impossible.
								</p>
							</div>
						</div>
					</div>
				</section>
			</ScrollReveal>

			{/* Technical Deep-Dive: Commit-Reveal */}
			<ScrollReveal>
				<section className="mb-16">
					<h2 className="mb-6 text-2xl font-semibold">
						Technical Deep-Dive: Commit-Reveal
					</h2>
					<div className="rounded-xl border bg-white p-6">
						<ProtocolDiagram />

						<div className="mt-6 space-y-4 text-gray-700">
							<p>
								The <strong>commit-reveal protocol</strong> is the core of
								provably fair systems. It ensures that:
							</p>
							<ul className="list-inside list-disc space-y-1 text-sm">
								<li>Ticket data is locked before any randomness is generated</li>
								<li>The random number comes from an external, verifiable source</li>
								<li>The winner selection formula is deterministic and public</li>
							</ul>
						</div>

						<DeepDive>
							<CodeBlock
								code={COMMIT_REVEAL_CODE}
								language="typescript"
								filename="commit-reveal.ts"
								highlightLines={[3, 4, 7, 10]}
							/>
						</DeepDive>
					</div>
				</section>
			</ScrollReveal>

			{/* Key Technologies - Expandable Cards */}
			<section className="mb-16">
				<ScrollReveal>
					<h2 className="mb-6 text-2xl font-semibold">Key Technologies</h2>
				</ScrollReveal>

				{/* Compact cards grid */}
				<ScrollRevealStagger stagger={0.1} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					{TECHNOLOGIES.map((tech) => {
						const colors = COLOR_CLASSES[tech.color];
						const Icon = tech.icon;
						const isSelected = selectedTech === tech.id;

						return (
							<button
								key={tech.id}
								type="button"
								onClick={() => handleTechSelect(tech.id)}
								className={`
									relative rounded-xl border p-4 text-left transition-all
									${isSelected ? `${colors.border} ${colors.bg} ring-2 ${colors.ring}` : 'border-neutral-200 bg-white hover:border-neutral-300'}
								`}
							>
								<div className="mb-2 flex items-center justify-between">
									<Icon className={`size-6 ${colors.icon}`} />
									<ChevronDown
										className={`size-4 text-neutral-400 transition-transform ${isSelected ? 'rotate-180' : ''}`}
									/>
								</div>
								<h3 className="font-semibold">{tech.title}</h3>
								<p className="mt-1 text-xs text-neutral-500 line-clamp-2">
									{tech.analogy}
								</p>
							</button>
						);
					})}
				</ScrollRevealStagger>

				{/* Full-width expansion */}
				<AnimatePresence>
					{selectedTech && (
						<motion.div
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: 'auto' }}
							exit={{ opacity: 0, height: 0 }}
							transition={{ duration: 0.3 }}
							className="overflow-hidden"
						>
							{(() => {
								const tech = TECHNOLOGIES.find((t) => t.id === selectedTech);
								if (!tech) return null;
								const colors = COLOR_CLASSES[tech.color];
								const Icon = tech.icon;

								return (
									<div className={`mt-4 rounded-xl border ${colors.border} ${colors.bg} p-6`}>
										<div className="mb-4 flex items-start justify-between">
											<div className="flex items-center gap-3">
												<Icon className={`size-8 ${colors.icon}`} />
												<div>
													<h3 className="text-lg font-semibold">{tech.title}</h3>
													<p className="text-sm text-neutral-600">{tech.description}</p>
												</div>
											</div>
											<button
												type="button"
												onClick={() => setSelectedTech(null)}
												className="rounded-full p-1 hover:bg-black/5"
											>
												<X className="size-5 text-neutral-500" />
											</button>
										</div>

										<p className="mb-4 text-sm text-neutral-500 italic">
											&ldquo;{tech.analogy}&rdquo;
										</p>

										<CodeBlock
											code={tech.code}
											language="typescript"
											filename={`${tech.id}.ts`}
										/>

										{tech.links.length > 0 && (
											<div className="mt-4 flex gap-3">
												{tech.links.map((link) => (
													<a
														key={link.href}
														href={link.href}
														target="_blank"
														rel="noopener noreferrer"
														className="text-sm text-blue-600 hover:underline"
													>
														{link.label} →
													</a>
												))}
											</div>
										)}
									</div>
								);
							})()}
						</motion.div>
					)}
				</AnimatePresence>
			</section>

			{/* Step-by-Step Process */}
			<section className="mb-16">
				<ScrollReveal>
					<h2 className="mb-6 text-2xl font-semibold">Step-by-Step Draw Process</h2>
				</ScrollReveal>
				<ScrollRevealStagger stagger={0.15} className="space-y-4">
					<ProcessStep
						number={1}
						icon={<FileCheck className="size-5" />}
						title="Manifest Creation"
						description="When sales close, we create a 'manifest'—a complete list of all tickets with their owners. This is uploaded to IPFS and cannot be changed."
					/>
					<ProcessStep
						number={2}
						icon={<Lock className="size-5" />}
						title="Blockchain Commitment"
						description="The manifest's unique fingerprint (hash) is recorded on the Arbitrum blockchain. This proves the ticket list existed at a specific time."
					/>
					<ProcessStep
						number={3}
						icon={<Dice5 className="size-5" />}
						title="Random Number Request"
						description="We request a random number from Chainlink VRF. This takes about 30 seconds as it requires blockchain confirmation."
					/>
					<ProcessStep
						number={4}
						icon={<CheckCircle2 className="size-5" />}
						title="Winner Selection"
						description="The random number is applied to the committed ticket list using a formula you can verify: (random % totalTickets) + 1 = winning ticket."
						code={WINNER_FORMULA_CODE}
					/>
				</ScrollRevealStagger>
			</section>

			{/* What You Can Verify */}
			<ScrollReveal>
				<section className="mb-16">
					<h2 className="mb-6 text-2xl font-semibold">What You Can Verify</h2>
					<div className="rounded-xl border bg-neutral-50 p-6">
						<div className="space-y-4">
							<VerificationItem
								icon={<Search className="size-5 text-blue-600" />}
								title="VRF Contract"
								description="View the Chainlink contract that generated the random number. See all random numbers ever generated."
							/>
							<VerificationItem
								icon={<Database className="size-5 text-purple-600" />}
								title="Manifest"
								description="Download the complete ticket list from IPFS. Verify your ticket exists and the total count matches."
							/>
							<VerificationItem
								icon={<Shield className="size-5 text-green-600" />}
								title="Commit Transaction"
								description="View the blockchain record that proves the manifest was locked before the random number was generated."
							/>
						</div>
					</div>
				</section>
			</ScrollReveal>

			{/* Verify Yourself */}
			<ScrollReveal>
				<section className="mb-16">
					<h2 className="mb-6 text-2xl font-semibold">Verify Yourself</h2>
					<p className="mb-4 text-gray-600">
						Have a ticket? Check if it&apos;s been properly committed and whether
						you won.
					</p>
					<TicketChecker />
				</section>
			</ScrollReveal>

			{/* CTA */}
			<ScrollReveal>
				<section className="text-center">
					<p className="mb-4 text-gray-600">
						Every winner on Raffly can be independently verified.
					</p>
					<Link
						href="/browse"
						className="inline-block rounded-full bg-black px-8 py-3 font-semibold text-white transition-colors hover:bg-gray-800"
					>
						Browse Raffles
					</Link>
				</section>
			</ScrollReveal>
		</div>
	);
}

interface ProcessStepProps {
	number: number;
	icon: React.ReactNode;
	title: string;
	description: string;
	code?: string;
}

/**
 * Step in the draw process timeline
 */
function ProcessStep({ number, icon, title, description, code }: ProcessStepProps) {
	return (
		<div className="flex gap-4">
			<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-black text-white">
				{number}
			</div>
			<div className="flex-1 rounded-xl border bg-white p-4">
				<div className="mb-1 flex items-center gap-2">
					{icon}
					<h3 className="font-semibold">{title}</h3>
				</div>
				<p className="text-sm text-gray-600">{description}</p>
				{code && (
					<DeepDive title="See the formula">
						<CodeBlock code={code} language="typescript" filename="winner-selection.ts" highlightLines={[5, 6]} />
					</DeepDive>
				)}
			</div>
		</div>
	);
}

interface VerificationItemProps {
	icon: React.ReactNode;
	title: string;
	description: string;
}

/**
 * Item in the verification list
 */
function VerificationItem({ icon, title, description }: VerificationItemProps) {
	return (
		<div className="flex gap-3">
			<div className="mt-0.5">{icon}</div>
			<div>
				<h3 className="font-medium">{title}</h3>
				<p className="text-sm text-gray-600">{description}</p>
			</div>
		</div>
	);
}
