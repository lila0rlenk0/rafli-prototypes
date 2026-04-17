'use client';

import { ExternalLink, HelpCircle } from 'lucide-react';
import Link from 'next/link';

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { CopyButton } from '@/components/ui/copy-button';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import {
	getArbiscanTxUrl,
	getIpfsUrl,
	getVrfCoordinatorUrl,
	getVrfHandlerUrl,
} from '@/lib/verification-links';
import { useWinnerVerification } from '@/services/verification/use-winner-verification';

import { VerifiedBadge } from './verified-badge';

interface WinnerVerificationProps {
	raffleId: string;
	position: number;
	totalTickets?: number;
	manifestHash?: string | null;
	commitTxHash?: string | null;
}

/**
 * WinnerVerification Component
 *
 * Fetches and displays verification data for a raffle winner.
 * Shows verification badge and expandable details accordion.
 */
export function WinnerVerification({
	raffleId,
	position,
	totalTickets,
	manifestHash,
	commitTxHash,
}: WinnerVerificationProps) {
	const { data: verification, isError } = useWinnerVerification(
		raffleId,
		position,
	);

	// Derive verified state from query data — null while loading
	const verified = verification ? verification.merkleVerified : null;

	function truncateHex(str: string): string {
		if (str.length <= 16) return str;
		return `${str.slice(0, 8)}...${str.slice(-6)}`;
	}

	function formatTicketContext(ticketId: number): string {
		if (totalTickets) {
			return `#${ticketId.toLocaleString()} of ${totalTickets.toLocaleString()} tickets`;
		}
		return `#${ticketId.toLocaleString()}`;
	}

	if (isError && !verification) {
		return <VerifiedBadge verified={false} />;
	}

	return (
		<div className="space-y-2">
			<VerifiedBadge verified={verified} />

			{verification ? (
				<Accordion type="single" collapsible className="w-full">
					<AccordionItem value="details" className="border-none">
						<AccordionTrigger className="py-1 text-xs text-gray-500 hover:no-underline">
							Verify result
						</AccordionTrigger>
						<AccordionContent className="space-y-3 pt-2 text-xs">
							<div className="space-y-1">
								<span className="text-gray-500">Winning Ticket</span>
								<p className="font-mono font-medium">
									{formatTicketContext(verification.actualTicketId)}
								</p>
								{/* Ticket code — the user-facing alphanumeric identifier
								    for the winning ticket, distinct from the numeric index */}
								{verification.ticketCode ? (
									<p className="font-mono text-gray-500">
										Code: {verification.ticketCode}
									</p>
								) : null}
							</div>

							<div className="space-y-1">
								<div className="flex items-center justify-between">
									<span className="text-gray-500">Random Number</span>
									<CopyButton value={verification.randomNumber} />
								</div>
								<div className="rounded bg-gray-100 px-2 py-1.5">
									<code
										className="block font-mono text-[11px]"
										title={verification.randomNumber}
									>
										{truncateHex(verification.randomNumber)}
									</code>
								</div>
							</div>

							<div className="space-y-1">
								<span className="text-gray-500">Selection Formula</span>
								<div className="rounded bg-gray-100 px-2 py-1.5">
									<code className="block font-mono text-[11px] break-all">
										{verification.formula}
									</code>
								</div>
							</div>

							<div className="flex flex-wrap gap-2 pt-1">
								{/* Chainlink-owned oracle — the cryptographic source of randomness */}
								<Tooltip>
									<TooltipTrigger asChild>
										<a
											href={getVrfCoordinatorUrl()}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-blue-600 hover:bg-blue-100"
										>
											Chainlink VRF
											<ExternalLink className="size-3" />
										</a>
									</TooltipTrigger>
									<TooltipContent>
										Chainlink&apos;s random number generator on Arbitrum
										blockchain
									</TooltipContent>
								</Tooltip>

								{/* Rafli-owned consumer — receives randomness and applies winner selection formula */}
								<Tooltip>
									<TooltipTrigger asChild>
										<a
											href={getVrfHandlerUrl()}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-1 rounded bg-neutral-100 px-2 py-1 text-neutral-700 hover:bg-neutral-200"
										>
											Rafli Handler
											<ExternalLink className="size-3" />
										</a>
									</TooltipTrigger>
									<TooltipContent>
										Rafli&apos;s contract that receives randomness and selects
										winners
									</TooltipContent>
								</Tooltip>

								{manifestHash ? (
									<Tooltip>
										<TooltipTrigger asChild>
											<a
												href={getIpfsUrl(manifestHash)}
												target="_blank"
												rel="noopener noreferrer"
												className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-blue-600 hover:bg-blue-100"
											>
												Manifest
												<ExternalLink className="size-3" />
											</a>
										</TooltipTrigger>
										<TooltipContent>
											Ticket data locked to IPFS before the draw
										</TooltipContent>
									</Tooltip>
								) : null}

								{commitTxHash ? (
									<Tooltip>
										<TooltipTrigger asChild>
											<a
												href={getArbiscanTxUrl(commitTxHash)}
												target="_blank"
												rel="noopener noreferrer"
												className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-blue-600 hover:bg-blue-100"
											>
												Commit TX
												<ExternalLink className="size-3" />
											</a>
										</TooltipTrigger>
										<TooltipContent>
											Blockchain record proving tickets were locked before
											randomness
										</TooltipContent>
									</Tooltip>
								) : null}
							</div>

							<Link
								href="/how-it-works"
								className="inline-flex items-center gap-1 pt-1 text-gray-500 hover:text-gray-700"
							>
								<HelpCircle className="size-3" />
								What does this mean?
							</Link>
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			) : null}
		</div>
	);
}
