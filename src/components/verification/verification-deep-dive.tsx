'use client';

import {
	AlertCircle,
	CheckCircle2,
	ChevronDown,
	Database,
	Dice5,
	ExternalLink,
	Link2,
	Loader2,
	ShieldCheck,
	TreeDeciduous,
	XCircle,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { CodeSnippet } from '@/components/ui/code-snippet';
import { CopyButton } from '@/components/ui/copy-button';
import { cn } from '@/lib/utils';
import {
	getArbiscanTxUrl,
	getIpfsUrl,
	getVrfContractUrl,
} from '@/lib/verification-links';
import { useRaffleVerification } from '@/services/verification/use-raffle-verification';
import type {
	RaffleVerificationData,
	WinnerVerification,
} from '@/types/verification';

function truncateHex(str: string, leading = 10, trailing = 8): string {
	if (str.length <= leading + trailing + 3) return str;
	return `${str.slice(0, leading)}...${str.slice(-trailing)}`;
}

interface VerificationDeepDiveProps {
	raffleId: string;
}

export function VerificationDeepDive({ raffleId }: VerificationDeepDiveProps) {
	const { data, isLoading, isError } = useRaffleVerification(raffleId);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="size-8 animate-spin text-neutral-400" />
			</div>
		);
	}

	if (isError || !data) {
		return (
			<div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
				<AlertCircle className="mx-auto mb-2 size-8 text-red-600" />
				<p className="text-red-600">Verification data not available</p>
				<Link
					href="/verify"
					className="mt-4 inline-block text-sm text-red-700 underline hover:no-underline"
				>
					Back to verification
				</Link>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<RaffleHeader data={data} />
			<BlockchainProofs data={data} />
			<WinnersList winners={data.winners} totalTickets={data.totalTickets} />
			<TechnicalNotes />
		</div>
	);
}

interface RaffleHeaderProps {
	data: RaffleVerificationData;
}

function RaffleHeader({ data }: RaffleHeaderProps) {
	const allVerified = data.winners.every(w => w.merkleVerified);
	const count = data.winners.length;
	const summaryText = `${data.totalTickets.toLocaleString()} tickets · ${count} ${count !== 1 ? 'winners' : 'winner'}`;

	return (
		<div className="rounded-2xl border border-black bg-white p-6">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h2 className="text-xl font-semibold">{data.title}</h2>
					<p className="mt-1 text-sm text-neutral-500">{summaryText}</p>
				</div>
				<div
					className={cn(
						'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium',
						allVerified
							? 'bg-green-50 text-green-600'
							: 'bg-yellow-50 text-yellow-600',
					)}
				>
					{allVerified ? (
						<>
							<ShieldCheck className="size-4" />
							Provably Fair
						</>
					) : (
						<>
							<AlertCircle className="size-4" />
							Partial Verification
						</>
					)}
				</div>
			</div>
		</div>
	);
}

interface BlockchainProofsProps {
	data: RaffleVerificationData;
}

function BlockchainProofs({ data }: BlockchainProofsProps) {
	return (
		<div className="rounded-2xl border border-black bg-white p-6">
			<h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
				<Link2 className="size-5" />
				Blockchain Proofs
			</h3>

			<div className="space-y-4">
				<ProofLink
					icon={<Database className="size-5 text-purple-600" />}
					label="IPFS Manifest"
					description="Complete ticket data, immutable"
					hash={data.manifestHash}
					url={data.manifestHash ? getIpfsUrl(data.manifestHash) : null}
					truncateHex={truncateHex}
				/>

				<ProofLink
					icon={<ShieldCheck className="size-5 text-blue-600" />}
					label="Commit Transaction"
					description="Ticket data locked before draw"
					hash={data.commitTxHash}
					url={data.commitTxHash ? getArbiscanTxUrl(data.commitTxHash) : null}
					truncateHex={truncateHex}
				/>

				<ProofLink
					icon={<Dice5 className="size-5 text-green-600" />}
					label="VRF Fulfill Transaction"
					description="Random number delivery proof"
					hash={data.vrfFulfillTxHash}
					url={
						data.vrfFulfillTxHash
							? getArbiscanTxUrl(data.vrfFulfillTxHash)
							: null
					}
					truncateHex={truncateHex}
				/>

				<div className="flex items-center justify-between border-t pt-4">
					<div className="flex items-center gap-2 text-sm text-neutral-500">
						<TreeDeciduous className="size-4" />
						VRF Request ID
					</div>
					{data.vrfRequestId ? (
						<div className="flex items-center gap-2">
							<code className="font-mono text-xs text-neutral-600">
								{data.vrfRequestId}
							</code>
							<CopyButton value={data.vrfRequestId} />
						</div>
					) : (
						<span className="text-xs text-neutral-400">Not available</span>
					)}
				</div>

				<a
					href={getVrfContractUrl()}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-600 hover:bg-blue-100"
				>
					View VRF Contract on Arbiscan
					<ExternalLink className="size-3" />
				</a>
			</div>
		</div>
	);
}

interface ProofLinkProps {
	icon: React.ReactNode;
	label: string;
	description: string;
	hash: string | null;
	url: string | null;
	truncateHex: (str: string) => string;
}

function ProofLink({
	icon,
	label,
	description,
	hash,
	url,
	truncateHex,
}: ProofLinkProps) {
	if (!hash) {
		return (
			<div className="flex items-center justify-between py-2">
				<div className="flex items-center gap-3">
					<div className="opacity-40">{icon}</div>
					<div>
						<div className="text-sm font-medium text-neutral-400">{label}</div>
						<div className="text-xs text-neutral-400">{description}</div>
					</div>
				</div>
				<span className="text-xs text-neutral-400">Not available</span>
			</div>
		);
	}

	return (
		<div className="flex items-center justify-between py-2">
			<div className="flex items-center gap-3">
				{icon}
				<div>
					<div className="text-sm font-medium">{label}</div>
					<div className="text-xs text-neutral-500">{description}</div>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<code
					className="rounded bg-neutral-100 px-2 py-1 font-mono text-xs"
					title={hash}
				>
					{truncateHex(hash)}
				</code>
				<CopyButton value={hash} />
				{url ? (
					<a
						href={url}
						target="_blank"
						rel="noopener noreferrer"
						className="rounded p-1 text-blue-600 hover:bg-blue-50"
					>
						<ExternalLink className="size-4" />
					</a>
				) : null}
			</div>
		</div>
	);
}

interface WinnersListProps {
	winners: WinnerVerification[];
	totalTickets: number;
}

function WinnersList({ winners, totalTickets }: WinnersListProps) {
	const [expandedWinner, setExpandedWinner] = useState<number | null>(null);

	if (winners.length === 0) {
		return (
			<div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 text-center text-neutral-500">
				No winners to display
			</div>
		);
	}

	return (
		<div className="rounded-2xl border border-black bg-white p-6">
			<h3 className="mb-4 text-lg font-semibold">Winner Verification</h3>

			<div className="space-y-3">
				{winners.map(winner => (
					<WinnerCard
						key={winner.position}
						winner={winner}
						totalTickets={totalTickets}
						isExpanded={expandedWinner === winner.position}
						onToggle={() =>
							setExpandedWinner(
								expandedWinner === winner.position ? null : winner.position,
							)
						}
					/>
				))}
			</div>
		</div>
	);
}

interface WinnerCardProps {
	winner: WinnerVerification;
	totalTickets: number;
	isExpanded: boolean;
	onToggle: () => void;
}

function WinnerCard({
	winner,
	totalTickets,
	isExpanded,
	onToggle,
}: WinnerCardProps) {
	const isMatch = winner.computedTicketId === winner.actualTicketId;

	return (
		<div className="rounded-xl border bg-neutral-50">
			<button
				type="button"
				onClick={onToggle}
				className="flex w-full items-center justify-between p-4"
			>
				<div className="flex items-center gap-3">
					<div className="flex size-8 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-700">
						{winner.position + 1}
					</div>
					<div className="text-left">
						<div className="text-sm font-medium">
							Ticket #{winner.actualTicketId}
						</div>
						<div className="font-mono text-xs text-neutral-500">
							{winner.ticketCode}
						</div>
					</div>
				</div>

				<div className="flex items-center gap-3">
					<div
						className={cn(
							'flex items-center gap-1 text-xs',
							winner.merkleVerified ? 'text-green-600' : 'text-red-600',
						)}
					>
						{winner.merkleVerified ? (
							<CheckCircle2 className="size-3" />
						) : (
							<XCircle className="size-3" />
						)}
						{winner.merkleVerified ? 'Verified' : 'Unverified'}
					</div>
					<ChevronDown
						className={cn(
							'size-5 text-neutral-400 transition-transform',
							isExpanded && 'rotate-180',
						)}
					/>
				</div>
			</button>

			<AnimatePresence>
				{isExpanded ? (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.2 }}
						className="overflow-hidden"
					>
						<div className="space-y-4 border-t p-4">
							<div className="grid gap-3 sm:grid-cols-2">
								<div>
									<div className="mb-1 text-xs text-neutral-500">
										Actual Ticket
									</div>
									<div className="font-mono text-sm">
										#{winner.actualTicketId}
									</div>
								</div>
								<div>
									<div className="mb-1 text-xs text-neutral-500">
										Computed Ticket
									</div>
									<div
										className={cn(
											'font-mono text-sm',
											isMatch ? 'text-green-600' : 'text-red-600',
										)}
									>
										#{winner.computedTicketId}
										{isMatch ? ' (Match)' : ' (Mismatch!)'}
									</div>
								</div>
							</div>

							<div className="space-y-1">
								<div className="flex items-center justify-between">
									<span className="text-xs text-neutral-500">
										Random Number
									</span>
									<CopyButton value={winner.randomNumber} />
								</div>
								<div className="rounded bg-white px-2 py-1.5">
									<code
										className="block font-mono text-[11px] break-all"
										title={winner.randomNumber}
									>
										{truncateHex(winner.randomNumber)}
									</code>
								</div>
							</div>

							<div className="space-y-1">
								<span className="text-xs text-neutral-500">
									Selection Formula
								</span>
								<div className="rounded bg-white px-2 py-1.5">
									<code className="block font-mono text-[11px] break-all">
										{winner.formula}
									</code>
								</div>
							</div>

							<div className="rounded bg-blue-50 p-3 text-xs text-blue-700">
								<strong>How to verify:</strong> Take the random number, apply
								modulo {totalTickets.toLocaleString()}, add 1. The result should
								equal #{winner.computedTicketId}.
							</div>
						</div>
					</motion.div>
				) : null}
			</AnimatePresence>
		</div>
	);
}

function TechnicalNotes() {
	const FORMULA_CODE = `// Winner Selection Formula
const randomNumber = BigInt(randomHex);
const totalTickets = ${'{total_tickets}'}n;

// Simple modulo operation
const winningIndex = Number(randomNumber % totalTickets);
const winningTicketId = winningIndex + 1;`;

	return (
		<Accordion
			type="single"
			collapsible
			className="rounded-2xl border border-black bg-white"
		>
			<AccordionItem value="notes" className="border-none">
				<AccordionTrigger className="px-6 py-4 text-lg font-semibold hover:no-underline">
					Technical Notes
				</AccordionTrigger>
				<AccordionContent className="space-y-4 px-6 pb-6">
					<p className="text-sm text-neutral-600">
						The winner selection uses a deterministic formula that anyone can
						verify:
					</p>

					<CodeSnippet code={FORMULA_CODE} language="typescript" />

					<ul className="list-inside list-disc space-y-1 text-sm text-neutral-600">
						<li>
							Random number comes from Chainlink VRF on Arbitrum blockchain
						</li>
						<li>
							Ticket data is committed to IPFS before random number generation
						</li>
						<li>Merkle tree verifies each ticket was in the committed set</li>
						<li>
							All proofs are publicly viewable and independently verifiable
						</li>
					</ul>

					<Link
						href="/how-it-works"
						className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
					>
						Learn more about provably fair raffles
						<ExternalLink className="size-3" />
					</Link>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}
