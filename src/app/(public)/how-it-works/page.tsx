'use client';

import {
	CheckCircle2,
	ChevronDown,
	Database,
	Dice5,
	FileCheck,
	Lock,
	Mail,
	Search,
	Shield,
	X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';

import { DeepDive } from '@/components/raffle/deep-dive';
import { CodeSnippet } from '@/components/ui/code-snippet';
import { ComparisonDiagram } from '@/components/ui/comparison-diagram';
import { ProtocolDiagram } from '@/components/ui/protocol-diagram';
import {
	ScrollReveal,
	ScrollRevealStagger,
} from '@/components/ui/scroll-reveal';
import { TicketChecker } from '@/components/verification/ticket-checker';

import { COMMIT_REVEAL_CODE, WINNER_FORMULA_CODE } from './code-snippets';
import { COLOR_CLASSES, TECHNOLOGIES } from './technologies';

/**
 * How It Works Page
 *
 * Educational page explaining the provably fair verification system
 * with progressive disclosure for technical users.
 */
export default function HowItWorksPage() {
	const [selectedTech, setSelectedTech] = useState<string | null>(null);

	/**
	 * Handles technology card selection — toggles on repeat click
	 */
	function handleTechSelect(id: string) {
		setSelectedTech(selectedTech === id ? null : id);
	}

	function handleCloseTechPanel() {
		setSelectedTech(null);
	}

	return (
		<div className="container mx-auto max-w-4xl px-4 py-12">
			{/* Hero */}
			<ScrollReveal>
				<header className="mb-16 text-center">
					<h1 className="font-clash-display mb-4 text-4xl font-bold sm:text-5xl">
						Every Winner Is Verifiable
					</h1>
					<p className="mx-auto max-w-2xl text-lg text-gray-600">
						All raffles on Rafli are designed so that winners can be
						independently verified. You don&apos;t need to take our word for it
						- the process is public and transparent!
					</p>
				</header>
			</ScrollReveal>

			{/* The Problem - Visual Comparison */}
			<ScrollReveal>
				<section className="mb-16">
					<h2 className="font-clash-display mb-6 text-2xl font-semibold">
						Traditional vs Provably Fair
					</h2>
					<ComparisonDiagram />
				</section>
			</ScrollReveal>

			{/* 30-Second Explainer */}
			<ScrollReveal>
				<section className="mb-16">
					<h2 className="font-clash-display mb-6 text-2xl font-semibold">
						The 30-Second Explanation
					</h2>
					<div className="rounded-xl border border-black bg-gradient-to-br from-neutral-50 to-white p-6">
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
										Before the draw, all ticket data is sealed and{' '}
										<strong>time-stamped</strong> (via a blockchain commitment)
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
					<h2 className="font-clash-display mb-6 text-2xl font-semibold">
						Technical Deep-Dive: Commit-Reveal
					</h2>
					<div className="rounded-xl border border-black bg-white p-6">
						<ProtocolDiagram />

						<div className="mt-6 space-y-4 text-gray-700">
							<p>
								The <strong>commit-reveal protocol</strong> is the core of
								provably fair systems. It ensures that:
							</p>
							<ul className="list-inside list-disc space-y-1 text-sm">
								<li>
									Ticket data is locked before any randomness is generated
								</li>
								<li>
									The random number comes from an external, verifiable source
								</li>
								<li>
									The winner selection formula is predefined and publicly
									available
								</li>
							</ul>
						</div>

						<DeepDive>
							<CodeSnippet code={COMMIT_REVEAL_CODE} language="typescript" />
						</DeepDive>
					</div>
				</section>
			</ScrollReveal>

			{/* Key Technologies - Expandable Cards */}
			<section className="mb-16">
				<ScrollReveal>
					<h2 className="font-clash-display mb-6 text-2xl font-semibold">
						Key Technologies
					</h2>
				</ScrollReveal>

				{/* Compact cards grid */}
				<ScrollRevealStagger
					stagger={0.1}
					className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
				>
					{TECHNOLOGIES.map(tech => {
						const colors = COLOR_CLASSES[tech.color];
						const Icon = tech.icon;
						const isSelected = selectedTech === tech.id;

						return (
							<button
								key={tech.id}
								type="button"
								onClick={() => handleTechSelect(tech.id)}
								className={`relative rounded-xl border p-4 text-left transition-all ${isSelected ? `${colors.border} ${colors.bg} ring-2 ${colors.ring}` : 'border-black bg-white hover:bg-neutral-50'} `}
							>
								<div className="mb-2 flex items-center justify-between">
									<Icon className={`size-6 ${colors.icon}`} />
									<ChevronDown
										className={`size-4 text-neutral-400 transition-transform ${isSelected ? 'rotate-180' : ''}`}
									/>
								</div>
								<h3 className="font-semibold">{tech.title}</h3>
								<p className="mt-1 line-clamp-2 text-xs text-neutral-500">
									{tech.analogy}
								</p>
							</button>
						);
					})}
				</ScrollRevealStagger>

				{/* Full-width expansion — renders detail panel for selected technology */}
				<AnimatePresence>
					{selectedTech ? (
						<ExpandedTechPanel
							selectedTech={selectedTech}
							onClose={handleCloseTechPanel}
						/>
					) : null}
				</AnimatePresence>
			</section>

			{/* Step-by-Step Process */}
			<section className="mb-16">
				<ScrollReveal>
					<h2 className="font-clash-display mb-6 text-2xl font-semibold">
						Step-by-Step Draw Process
					</h2>
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
						description="The manifest's unique fingerprint (hash) is recorded on the Arbitrum blockchain. This proves the ticket list existed at a specific point in time."
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
						isLast
					/>
				</ScrollRevealStagger>
			</section>

			{/* What You Can Verify */}
			<ScrollReveal>
				<section className="mb-16">
					<h2 className="font-clash-display mb-6 text-2xl font-semibold">
						What You Can Verify
					</h2>
					<div className="rounded-xl border border-black bg-white p-6">
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
					<h2 className="font-clash-display mb-6 text-2xl font-semibold">
						Verify Yourself
					</h2>
					<p className="mb-4 text-gray-600">
						Have a ticket? Check how it was included in the draw and see whether
						it won.
					</p>
					<TicketChecker />
				</section>
			</ScrollReveal>

			{/* CTA */}
			<ScrollReveal>
				<section className="text-center">
					<p className="mb-4 text-gray-600">
						Every winner on Rafli can be independently verified.
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

interface ExpandedTechPanelProps {
	selectedTech: string;
	onClose: () => void;
}

/**
 * Expanded detail panel for a selected technology card.
 * Extracted from HowItWorksPage to avoid inline IIFE in JSX.
 * Shows description, analogy, code snippet, and external links.
 */
function ExpandedTechPanel({ selectedTech, onClose }: ExpandedTechPanelProps) {
	const tech = TECHNOLOGIES.find(t => t.id === selectedTech);
	if (!tech) return null;

	const colors = COLOR_CLASSES[tech.color];
	const Icon = tech.icon;

	return (
		<motion.div
			initial={{ opacity: 0, height: 0 }}
			animate={{ opacity: 1, height: 'auto' }}
			exit={{ opacity: 0, height: 0 }}
			transition={{ duration: 0.3 }}
			className="overflow-hidden"
		>
			<div
				className={`mt-4 rounded-xl border ${colors.border} ${colors.bg} p-6`}
			>
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
						onClick={onClose}
						className="rounded-full p-1 hover:bg-black/5"
					>
						<X className="size-5 text-neutral-500" />
					</button>
				</div>

				<p className="mb-4 text-sm text-neutral-500 italic">
					&ldquo;{tech.analogy}&rdquo;
				</p>

				<CodeSnippet code={tech.code} language="typescript" />

				{tech.links.length > 0 ? (
					<div className="mt-4 flex gap-3">
						{tech.links.map(link => (
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
				) : null}
			</div>
		</motion.div>
	);
}

interface ProcessStepProps {
	number: number;
	icon: React.ReactNode;
	title: string;
	description: string;
	code?: string;
	isLast?: boolean;
}

/**
 * Step in the draw process timeline
 */
function ProcessStep({
	number,
	icon,
	title,
	description,
	code,
	isLast = false,
}: ProcessStepProps) {
	return (
		<div className="flex gap-4">
			<div className="flex flex-col items-center">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-black text-white">
					{number}
				</div>
				{!isLast ? (
					<div className="mt-2 h-full w-0.5 flex-1 bg-neutral-200" />
				) : null}
			</div>
			<div className="flex-1 rounded-xl border border-black bg-white p-4">
				<div className="mb-1 flex items-center gap-2">
					{icon}
					<h3 className="font-semibold">{title}</h3>
				</div>
				<p className="text-sm text-gray-600">{description}</p>
				{code ? (
					<DeepDive title="See the formula">
						<CodeSnippet code={code} language="typescript" />
					</DeepDive>
				) : null}
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
