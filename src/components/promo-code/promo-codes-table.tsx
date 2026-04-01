'use client';

import {
	Copy,
	Link2,
	MoreHorizontal,
	Ticket,
	DollarSign,
	Percent,
	XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
	formatPromoCodeUsage,
	formatPromoCodeValue,
	formatUsageLimit,
	getPromoCodeStatus,
	PROMO_CODE_STATUS,
	PROMO_CODE_TYPE,
	type PromoCode,
} from '@/types/promo-code';

import { DeactivatePromoCodeModal } from './deactivate-promo-code-modal';
import { PromoCodeStatusBadge } from './promo-code-status-badge';

/**
 * Props for PromoCodesTable
 */
interface PromoCodesTableProps {
	codes: PromoCode[];
	isReadOnly?: boolean;
	onDeactivate?: (codeId: string) => Promise<void>;
	/** Public slug for generating share links */
	publicSlug?: string;
}

/**
 * Formats expiration date for display
 */
function formatExpiration(expiresAt: string | null): string {
	if (!expiresAt) return 'Never';

	return new Date(expiresAt).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
}

/**
 * Returns icon for promo code type
 */
function TypeIcon({ type }: { type: PromoCode['type'] }) {
	switch (type) {
		case PROMO_CODE_TYPE.FREE_TICKETS:
			return <Ticket className="size-4 text-blue-600" />;
		case PROMO_CODE_TYPE.DISCOUNT_FIXED:
			return <DollarSign className="size-4 text-green-600" />;
		case PROMO_CODE_TYPE.DISCOUNT_PERCENT:
			return <Percent className="size-4 text-purple-600" />;
		default:
			return null;
	}
}

/**
 * Returns label for promo code type
 */
function getTypeLabel(type: PromoCode['type']): string {
	switch (type) {
		case PROMO_CODE_TYPE.FREE_TICKETS:
			return 'Free';
		case PROMO_CODE_TYPE.DISCOUNT_FIXED:
			return 'Fixed';
		case PROMO_CODE_TYPE.DISCOUNT_PERCENT:
			return 'Percent';
		default:
			return type;
	}
}

/**
 * PromoCodesTable Component
 *
 * Displays promo codes in a table with copy, status, and actions.
 * Responsive: stacks on mobile.
 */
export function PromoCodesTable({
	codes,
	isReadOnly = false,
	onDeactivate,
	publicSlug,
}: PromoCodesTableProps) {
	const [deactivatingCode, setDeactivatingCode] = useState<PromoCode | null>(
		null,
	);
	const [isDeactivating, setIsDeactivating] = useState(false);

	/**
	 * Copies share link with promo code to clipboard
	 */
	async function handleCopyShareLink(code: string) {
		const origin = typeof window !== 'undefined' ? window.location.origin : '';
		const shareUrl = `${origin}/browse/${publicSlug}?code=${code}`;
		try {
			// Step 1: Copy share URL.
			await navigator.clipboard.writeText(shareUrl);
			// Step 2: Notify success.
			toast.success('Share link copied');
		} catch {
			toast.error('Failed to copy link');
		}
	}

	/**
	 * Copies batch ID to clipboard
	 */
	async function handleCopyBatchId(bulkId: string) {
		try {
			// Step 1: Copy batch ID.
			await navigator.clipboard.writeText(bulkId);
			// Step 2: Notify success.
			toast.success('Batch ID copied');
		} catch {
			toast.error('Failed to copy batch ID');
		}
	}

	/**
	 * Handles deactivate action
	 */
	async function handleDeactivate() {
		if (!deactivatingCode || !onDeactivate) return;

		// Step 1: Call deactivate handler.
		setIsDeactivating(true);
		try {
			await onDeactivate(deactivatingCode.id);
		} finally {
			// Step 2: Reset modal state.
			setIsDeactivating(false);
			setDeactivatingCode(null);
		}
	}

	/**
	 * Checks if deactivate action should be shown for a code
	 */
	function canDeactivate(code: PromoCode): boolean {
		if (isReadOnly) return false;
		const status = getPromoCodeStatus(code);
		return status === PROMO_CODE_STATUS.ACTIVE;
	}

	/**
	 * Checks if any actions are available for a code
	 */
	function hasActions(code: PromoCode): boolean {
		return canDeactivate(code) || !!code.bulkId;
	}

	if (codes.length === 0) {
		return null;
	}

	return (
		<>
			{/* Desktop Table */}
			<div className="hidden overflow-x-auto md:block">
				<table className="w-full min-w-[600px]">
					<thead>
						<tr className="border-b border-[#F1F3F5] text-left text-sm text-gray-500">
							<th className="pb-3 font-medium">Code</th>
							<th className="pb-3 font-medium">Type</th>
							<th className="pb-3 font-medium">Value</th>
							<th className="pb-3 font-medium">Usage</th>
							<th className="pb-3 font-medium">Per User</th>
							<th className="pb-3 font-medium">Status</th>
							<th className="pb-3 font-medium">Expires</th>
							<th className="pb-3 text-right font-medium" />
						</tr>
					</thead>
					<tbody>
						{codes.map(code => (
							<tr key={code.id} className="border-t border-b border-[#F1F3F5]">
								<td className="py-4">
									<div className="flex items-center gap-2">
										<span className="font-mono">{code.code}</span>
										<CopyButton value={code.code} />
										{publicSlug && (
											<Button
												variant="ghost"
												size="icon-sm"
												onClick={() => handleCopyShareLink(code.code)}
												className="-ml-1 text-gray-400 hover:text-gray-600"
												title="Copy share link"
											>
												<Link2 className="size-4" />
											</Button>
										)}
									</div>
								</td>
								<td className="py-4">
									<div className="flex items-center gap-1.5">
										<TypeIcon type={code.type} />
										<span className="text-sm">{getTypeLabel(code.type)}</span>
									</div>
								</td>
								<td className="py-4 font-medium">
									{formatPromoCodeValue(code)}
								</td>
								<td className="py-4">{formatPromoCodeUsage(code)}</td>
								<td className="py-4">
									{formatUsageLimit(code.maxRedemptionsPerUser)}
								</td>
								<td className="py-4">
									<PromoCodeStatusBadge code={code} />
								</td>
								<td className="py-4">{formatExpiration(code.expiresAt)}</td>
								<td className="py-4 text-right">
									{hasActions(code) && (
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													variant="ghost"
													size="icon-sm"
													className="text-gray-500 hover:text-gray-700"
												>
													<MoreHorizontal className="size-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												{code.bulkId && (
													<DropdownMenuItem
														onClick={() => handleCopyBatchId(code.bulkId!)}
													>
														<Copy className="size-4" />
														Copy Batch ID
													</DropdownMenuItem>
												)}
												{canDeactivate(code) && (
													<DropdownMenuItem
														onClick={() => setDeactivatingCode(code)}
														className="text-red-600 focus:text-red-600"
													>
														<XCircle className="size-4" />
														Deactivate
													</DropdownMenuItem>
												)}
											</DropdownMenuContent>
										</DropdownMenu>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Mobile Cards */}
			<div className="space-y-3 md:hidden">
				{codes.map(code => (
					<div
						key={code.id}
						className="rounded-lg border border-gray-200 bg-white p-4"
					>
						<div className="flex items-start justify-between">
							<div className="flex items-center gap-2">
								<span className="font-mono font-medium">{code.code}</span>
								<CopyButton value={code.code} size="sm" />
								{publicSlug && (
									<Button
										variant="ghost"
										size="icon-sm"
										onClick={() => handleCopyShareLink(code.code)}
										className="text-gray-400 hover:text-gray-600"
										title="Copy share link"
									>
										<Link2 className="size-3.5" />
									</Button>
								)}
							</div>
							{hasActions(code) && (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="ghost"
											size="icon-sm"
											className="text-gray-500 hover:text-gray-700"
										>
											<MoreHorizontal className="size-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										{code.bulkId && (
											<DropdownMenuItem
												onClick={() => handleCopyBatchId(code.bulkId!)}
											>
												<Copy className="size-4" />
												Copy Batch ID
											</DropdownMenuItem>
										)}
										{canDeactivate(code) && (
											<DropdownMenuItem
												onClick={() => setDeactivatingCode(code)}
												className="text-red-600 focus:text-red-600"
											>
												<XCircle className="size-4" />
												Deactivate
											</DropdownMenuItem>
										)}
									</DropdownMenuContent>
								</DropdownMenu>
							)}
						</div>

						<div className="mt-3 flex items-center gap-2 text-sm">
							<TypeIcon type={code.type} />
							<span>{getTypeLabel(code.type)}</span>
							<PromoCodeStatusBadge code={code} />
						</div>

						<div className="mt-2 text-sm font-medium">
							{formatPromoCodeValue(code)}
						</div>

						<div className="mt-2 text-xs text-gray-500">
							{formatPromoCodeUsage(code)} used • Per user:{' '}
							{formatUsageLimit(code.maxRedemptionsPerUser)}
							{code.expiresAt &&
								` • Expires ${formatExpiration(code.expiresAt)}`}
							{!code.expiresAt && ' • Never expires'}
						</div>
					</div>
				))}
			</div>

			{/* Deactivate Modal */}
			<DeactivatePromoCodeModal
				code={deactivatingCode}
				isOpen={!!deactivatingCode}
				isLoading={isDeactivating}
				onClose={() => setDeactivatingCode(null)}
				onConfirm={handleDeactivate}
			/>
		</>
	);
}

/**
 * PromoCodesTableSkeleton Component
 *
 * Loading skeleton for the promo codes table.
 * Displays placeholder rows while data is being fetched.
 */
export function PromoCodesTableSkeleton() {
	return (
		<div className="space-y-3">
			{Array.from({ length: 3 }).map((_, i) => (
				<div
					key={i}
					className={cn(
						'flex items-center gap-4 rounded-lg border border-gray-200 p-4',
						'md:rounded-none md:border-0 md:border-b md:border-gray-100',
					)}
				>
					<Skeleton className="h-5 w-24" />
					<Skeleton className="h-5 w-16" />
					<Skeleton className="h-5 w-20" />
					<Skeleton className="h-5 w-12" />
					<Skeleton className="h-5 w-16" />
				</div>
			))}
		</div>
	);
}
