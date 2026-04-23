'use client';

import { ChevronDown, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { useState } from 'react';

import { CopyButton } from '@/components/ui-custom/copy-button';
import { cn } from '@/lib/class-names';
import type { MerkleProof } from '@/types/verification';

interface MerkleProofDisplayProps {
	proof: MerkleProof;
	className?: string;
}

export function MerkleProofDisplay({
	proof,
	className,
}: MerkleProofDisplayProps) {
	const [expanded, setExpanded] = useState(false);

	function truncateHex(str: string): string {
		if (str.length <= 16) return str;
		return `${str.slice(0, 10)}...${str.slice(-8)}`;
	}

	return (
		<div className={cn('rounded-lg border bg-white', className)}>
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className="flex w-full items-center justify-between p-3 text-left"
			>
				<div className="flex items-center gap-2">
					{expanded ? (
						<ChevronDown className="size-4 text-neutral-500" />
					) : (
						<ChevronRight className="size-4 text-neutral-500" />
					)}
					<span className="text-sm font-medium">Merkle Proof</span>
					<span
						className={cn(
							'flex items-center gap-1 text-xs',
							proof.merkleVerified ? 'text-green-600' : 'text-red-600',
						)}
					>
						{proof.merkleVerified ? (
							<CheckCircle2 className="size-3" />
						) : (
							<XCircle className="size-3" />
						)}
						{proof.merkleVerified ? 'Valid' : 'Invalid'}
					</span>
				</div>
				<span className="text-xs text-neutral-500">
					{proof.proof.length} node{proof.proof.length !== 1 ? 's' : ''}
				</span>
			</button>

			{expanded ? (
				<div className="flex flex-col gap-3 border-t p-3">
					<ProofRow label="Entry ID" value={`#${proof.ticketId}`} />
					<ProofRow label="Chunk Index" value={proof.chunkIndex.toString()} />

					<div className="flex flex-col gap-1">
						<div className="flex items-center justify-between">
							<span className="text-xs text-neutral-500">Leaf Hash</span>
							<CopyButton value={proof.leafHash} />
						</div>
						<div className="rounded bg-neutral-100 px-2 py-1.5">
							<code
								className="text-2xs block font-mono break-all"
								title={proof.leafHash}
							>
								{truncateHex(proof.leafHash)}
							</code>
						</div>
					</div>

					<div className="flex flex-col gap-1">
						<div className="flex items-center justify-between">
							<span className="text-xs text-neutral-500">Merkle Root</span>
							<CopyButton value={proof.root} />
						</div>
						<div className="rounded bg-neutral-100 px-2 py-1.5">
							<code
								className="text-2xs block font-mono break-all"
								title={proof.root}
							>
								{truncateHex(proof.root)}
							</code>
						</div>
					</div>

					<div className="flex flex-col gap-2">
						<span className="text-xs text-neutral-500">Proof Path</span>
						<div className="flex flex-col gap-1">
							{proof.proof.map((hash, index) => (
								<div
									key={hash}
									className="flex items-center gap-2 rounded bg-neutral-50 px-2 py-1"
								>
									<span className="text-3xs w-4 text-neutral-400">
										{index + 1}
									</span>
									<code
										className="text-3xs flex-1 truncate font-mono"
										title={hash}
									>
										{truncateHex(hash)}
									</code>
									<CopyButton value={hash} size="sm" />
								</div>
							))}
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}

interface ProofRowProps {
	label: string;
	value: string;
}

function ProofRow({ label, value }: ProofRowProps) {
	return (
		<div className="flex items-center justify-between text-xs">
			<span className="text-neutral-500">{label}</span>
			<span className="font-medium">{value}</span>
		</div>
	);
}
