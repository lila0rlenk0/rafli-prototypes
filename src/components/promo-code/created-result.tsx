'use client';

import { Check, Copy, Download } from 'lucide-react';
import { useState } from 'react';

import { ColoredCards } from '@/components/promo-code/create/decorations';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { useTimeout } from '@/lib/hooks/use-timeout';
import { cn } from '@/lib/class-names';

/** Maximum codes to list inline before collapsing into a "+N more" hint. */
const MAX_DISPLAY_CODES = 10;
/** Duration for the transient "Copied!" confirmation before reverting. */
const COPY_CONFIRM_MS = 2_000;

interface CreatedCodesResultProps {
	isOpen: boolean;
	codes: string[];
	bulkId?: string;
	onClose: () => void;
	onExportBatch?: (bulkId: string) => void;
}

/**
 * Success panel rendered after create succeeds — shows the generated
 * code (or list) with per-row copy, a Copy-All shortcut for batches,
 * and an optional "Export Batch" CTA when the caller wires one in.
 * Kept as a dedicated dialog instance so the form dialog can unmount
 * cleanly between the two states.
 */
export function CreatedCodesResult({
	isOpen,
	codes,
	bulkId,
	onClose,
	onExportBatch,
}: CreatedCodesResultProps) {
	const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
	const [copiedAll, setCopiedAll] = useState(false);
	const setCopyTimeout = useTimeout();
	const setCopyAllTimeout = useTimeout();

	const isSingle = codes.length === 1;
	const displayedCodes = codes.slice(0, MAX_DISPLAY_CODES);
	const remainingCount = codes.length - MAX_DISPLAY_CODES;

	async function handleCopyCode(code: string, index: number) {
		await navigator.clipboard.writeText(code);
		setCopiedIndex(index);
		setCopyTimeout(() => setCopiedIndex(null), COPY_CONFIRM_MS);
	}

	async function handleCopyAll() {
		await navigator.clipboard.writeText(codes.join('\n'));
		setCopiedAll(true);
		setCopyAllTimeout(() => setCopiedAll(false), COPY_CONFIRM_MS);
	}

	function renderExportBatch() {
		if (bulkId === undefined || !onExportBatch) return null;
		return (
			<Button
				variant="outline"
				size="sm"
				onClick={() => onExportBatch(bulkId)}
				className="flex-1"
			>
				<Download className="size-4" />
				Export Batch
			</Button>
		);
	}

	return (
		<Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
			<DialogContent className="border-ink-alpha max-w-sm overflow-hidden border text-center">
				<ColoredCards className="absolute right-0 bottom-0 -z-1 rounded-br-xl" />

				<DialogHeader className="items-center">
					<div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-green-100">
						<Check className="size-6 text-green-600" />
					</div>
					<DialogTitle className="font-clash-display text-navy text-3xl font-semibold">
						{isSingle
							? 'Promo Code Created!'
							: `${codes.length} Codes Created!`}
					</DialogTitle>
				</DialogHeader>

				<div className="my-4 flex flex-col gap-2">
					{isSingle ? (
						<button
							type="button"
							onClick={() => handleCopyCode(codes[0], 0)}
							className={cn(
								'mx-auto flex items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-3',
								'transition-colors hover:border-gray-400 hover:bg-gray-50',
							)}
						>
							<span className="font-mono text-lg font-bold">{codes[0]}</span>
							{copiedIndex === 0 ? (
								<Check className="size-4 text-green-600" />
							) : (
								<Copy className="size-4 text-gray-400" />
							)}
						</button>
					) : (
						<>
							<div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2">
								{displayedCodes.map((code, index) => (
									<button
										key={code}
										type="button"
										onClick={() => handleCopyCode(code, index)}
										className={cn(
											'flex w-full items-center justify-between rounded px-2 py-1',
											'transition-colors hover:bg-gray-100',
										)}
									>
										<span className="font-mono text-sm">{code}</span>
										{copiedIndex === index ? (
											<Check className="size-3 text-green-600" />
										) : (
											<Copy className="size-3 text-gray-400" />
										)}
									</button>
								))}
							</div>
							{remainingCount > 0 ? (
								<p className="text-xs text-gray-500">
									+{remainingCount} more code
									{remainingCount !== 1 ? 's' : ''} (use Copy All or Export)
								</p>
							) : null}
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={handleCopyAll}
									className="flex-1"
								>
									{copiedAll ? (
										<>
											<Check className="size-4" />
											Copied!
										</>
									) : (
										<>
											<Copy className="size-4" />
											Copy All
										</>
									)}
								</Button>
								{renderExportBatch()}
							</div>
						</>
					)}
				</div>

				<div className="flex justify-center">
					<Button
						onClick={onClose}
						className="font-clash-display hover:bg-background w-full max-w-xs cursor-pointer border-2 border-black bg-black font-semibold hover:text-black"
					>
						Done
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
