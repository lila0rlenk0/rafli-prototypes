'use client';

import { AlertCircle, CheckCircle2, ExternalLink, XCircle } from 'lucide-react';
import { CopyButton } from '@/components/ui-custom/copy-button';
import { truncateVerificationHash } from '@/components/verification/story/ticket-verification-story-model';
import { cn } from '@/lib/class-names';
import {
	getArbiscanTxUrl,
	getVrfCoordinatorUrl,
	getVrfHandlerUrl,
} from '@/lib/verification/links';
import type { RaffleVerificationPayload } from '@/types/verification';
import type { WinnerVerification } from '@/types/verification';

export type StoryStepStatus = 'success' | 'error' | 'warning' | 'neutral';

export interface StoryStepProps {
	number: number;
	title: string;
	status: StoryStepStatus;
	children: React.ReactNode;
}

/**
 * A single step in the verification story timeline.
 * Number badge on the left, title + status icon on the right, content below.
 */
export function StoryStep({ number, title, status, children }: StoryStepProps) {
	return (
		<div className="bg-card rounded-lg border p-4">
			<div className="mb-2 flex items-center gap-3">
				<span className="bg-muted flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
					{number}
				</span>
				<h4 className="flex-1 text-sm font-semibold">{title}</h4>
				<StepStatusIcon status={status} />
			</div>
			<div className="text-muted-foreground ml-9 text-sm">{children}</div>
		</div>
	);
}

interface StepStatusIconProps {
	status: StoryStepStatus;
}

/** Visual status indicator for each story step */
export function StepStatusIcon({ status }: StepStatusIconProps) {
	switch (status) {
		case 'success':
			return <CheckCircle2 className="size-4 shrink-0 text-green-600" />;
		case 'error':
			return <XCircle className="size-4 shrink-0 text-red-600" />;
		case 'warning':
			return <AlertCircle className="size-4 shrink-0 text-amber-600" />;
		case 'neutral':
			return null;
		default: {
			const _exhaustive: never = status;
			return _exhaustive;
		}
	}
}

export interface StoryErrorProps {
	message: string;
	onReset: () => void;
}

/** Error state — shown when the ticket verification call fails */
export function StoryError({ message, onReset }: StoryErrorProps) {
	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-2 text-red-600">
				<AlertCircle className="size-5" />
				<span className="font-semibold">Verification Failed</span>
			</div>
			<p className="text-muted-foreground text-sm">{message}</p>
			<button
				type="button"
				onClick={onReset}
				className="border-border hover:bg-muted w-full rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
			>
				Try Again
			</button>
		</div>
	);
}

export interface FormulaDisplayProps {
	formula: WinnerVerification;
	variant: 'default' | 'winner';
}

/**
 * Shows the VRF random number and modulo formula in a compact, readable format.
 * Highlights the result differently for winners vs non-winners.
 *
 * Layout: three rows (random → formula → result) read top-to-bottom like a
 * simple arithmetic problem. Non-tech users can follow the flow without
 * understanding modular arithmetic — the labels do the heavy lifting.
 */
export function FormulaDisplay({ formula, variant }: FormulaDisplayProps) {
	const bgClass = variant === 'winner' ? 'bg-green-50' : 'bg-muted';

	return (
		<div className={cn('rounded-lg p-3', bgClass)}>
			<div className="flex flex-col gap-1.5 text-sm">
				<div className="flex items-center justify-between gap-2">
					<span className="text-muted-foreground shrink-0">Random number</span>
					<div className="flex items-center gap-1">
						<code className="truncate font-mono text-xs">
							{truncateVerificationHash(formula.randomNumber)}
						</code>
						<CopyButton value={formula.randomNumber} />
					</div>
				</div>

				<div className="flex items-center justify-between gap-2">
					<span className="text-muted-foreground shrink-0">Formula</span>
					<code className="truncate font-mono text-xs">{formula.formula}</code>
				</div>

				<div className="border-border flex items-center justify-between gap-2 border-t pt-1.5">
					<span className="text-muted-foreground">Winning entry</span>
					<span
						className={cn(
							'font-semibold',
							variant === 'winner' ? 'text-green-700' : '',
						)}
					>
						Entry #{formula.actualTicketId.toLocaleString()}
						{variant === 'winner' ? ' — yours' : null}
					</span>
				</div>

				{formula.computedTicketId !== formula.actualTicketId ? (
					<div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
						<span>Raw result</span>
						<span>
							#{formula.computedTicketId.toLocaleString()} (skipped — voided or
							duplicate)
						</span>
					</div>
				) : null}
			</div>
		</div>
	);
}

export interface BlockchainLinksProps {
	raffle: RaffleVerificationPayload | null;
}

/** External links to Arbiscan for VRF transaction and contract verification */
export function BlockchainLinks({ raffle }: BlockchainLinksProps) {
	return (
		<div className="flex flex-wrap gap-3">
			{raffle?.vrfFulfillTxHash ? (
				<a
					href={getArbiscanTxUrl(raffle.vrfFulfillTxHash)}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
				>
					VRF transaction
					<ExternalLink className="size-3" />
				</a>
			) : null}
			<a
				href={getVrfCoordinatorUrl()}
				target="_blank"
				rel="noopener noreferrer"
				className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
			>
				Chainlink VRF Coordinator
				<ExternalLink className="size-3" />
			</a>
			<a
				href={getVrfHandlerUrl()}
				target="_blank"
				rel="noopener noreferrer"
				className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
			>
				Rafli VRF Handler
				<ExternalLink className="size-3" />
			</a>
		</div>
	);
}
