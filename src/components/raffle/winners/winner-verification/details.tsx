'use client';

import { HelpCircle } from 'lucide-react';
import Link from 'next/link';

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { CopyButton } from '@/components/ui-custom/copy-button';
import { VerificationEvidenceLink } from '@/components/raffle/winners/winner-verification/evidence-link';
import {
	getArbiscanTxUrl,
	getIpfsUrl,
	getVrfCoordinatorUrl,
	getVrfHandlerUrl,
} from '@/lib/verification/links';
import type { WinnerVerification } from '@/types/verification';

interface VerificationDetailsProps {
	verification: WinnerVerification;
	totalTickets?: number;
	manifestHash?: string | null;
	commitTxHash?: string | null;
}

/**
 * Abbreviates a long hex string to a `prefix…suffix` form so the UI can
 * render it on a single line without truncating in the middle of a
 * meaningful segment.
 *
 * @returns The original string if short, otherwise `aaaaaaaa…bbbbbb`.
 */
function truncateHex(str: string): string {
	if (str.length <= 16) return str;
	return `${str.slice(0, 8)}...${str.slice(-6)}`;
}

/**
 * Formats the winning-ticket context line as `#<id> of <n> entries` when
 * the total is known, otherwise just the id.
 */
function formatTicketContext(ticketId: number, totalTickets?: number): string {
	if (totalTickets) {
		return `#${ticketId.toLocaleString()} of ${totalTickets.toLocaleString()} entries`;
	}
	return `#${ticketId.toLocaleString()}`;
}

/**
 * Collapsible verification details — winning entry, random number,
 * selection formula, and the evidence link row. Extracted so the
 * container component only arbitrates the loaded/error/verified state
 * machine.
 */
export function VerificationDetails({
	verification,
	totalTickets,
	manifestHash,
	commitTxHash,
}: VerificationDetailsProps) {
	return (
		<Accordion type="single" collapsible className="w-full">
			<AccordionItem value="details" className="border-none">
				<AccordionTrigger className="py-1 text-xs text-gray-500 hover:no-underline">
					Verify result
				</AccordionTrigger>
				<AccordionContent className="flex flex-col gap-3 pt-2 text-xs">
					<div className="flex flex-col gap-1">
						<span className="text-gray-500">Winning Entry</span>
						<p className="font-mono font-medium">
							{formatTicketContext(verification.actualTicketId, totalTickets)}
						</p>
						{/* Entry code — the user-facing alphanumeric identifier for
						    the winning entry, distinct from the numeric index. */}
						{verification.ticketCode ? (
							<p className="font-mono text-gray-500">
								Code: {verification.ticketCode}
							</p>
						) : null}
					</div>

					<div className="flex flex-col gap-1">
						<div className="flex items-center justify-between">
							<span className="text-gray-500">Random Number</span>
							<CopyButton value={verification.randomNumber} />
						</div>
						<div className="rounded bg-gray-100 px-2 py-1.5">
							<code
								className="text-2xs block font-mono"
								title={verification.randomNumber}
							>
								{truncateHex(verification.randomNumber)}
							</code>
						</div>
					</div>

					<div className="flex flex-col gap-1">
						<span className="text-gray-500">Selection Formula</span>
						<div className="rounded bg-gray-100 px-2 py-1.5">
							<code className="text-2xs block font-mono break-all">
								{verification.formula}
							</code>
						</div>
					</div>

					<div className="flex flex-wrap gap-2 pt-1">
						<VerificationEvidenceLink
							href={getVrfCoordinatorUrl()}
							label="Chainlink VRF"
							tooltip="Chainlink's random number generator on Arbitrum blockchain"
							tone="blue"
						/>
						<VerificationEvidenceLink
							href={getVrfHandlerUrl()}
							label="Rafli Handler"
							tooltip="Rafli's contract that receives randomness and selects winners"
							tone="neutral"
						/>
						{manifestHash ? (
							<VerificationEvidenceLink
								href={getIpfsUrl(manifestHash)}
								label="Manifest"
								tooltip="Entry data locked to IPFS before the draw"
								tone="blue"
							/>
						) : null}
						{commitTxHash ? (
							<VerificationEvidenceLink
								href={getArbiscanTxUrl(commitTxHash)}
								label="Commit TX"
								tooltip="Blockchain record proving entries were locked before randomness"
								tone="blue"
							/>
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
	);
}
