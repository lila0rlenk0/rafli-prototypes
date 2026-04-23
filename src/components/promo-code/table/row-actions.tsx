'use client';

import { Copy, MoreHorizontal, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getPromoCodeStatus } from '@/lib/utils/format/promo-code-format';
import { PROMO_CODE_STATUS, type PromoCode } from '@/types/promo-code';

/**
 * Props for PromoCodeRowActions.
 */
interface PromoCodeRowActionsProps {
	code: PromoCode;
	isReadOnly: boolean;
	onCopyBatchId: (bulkId: string) => void;
	onRequestDeactivate: (code: PromoCode) => void;
}

/**
 * Whether the Deactivate action is offered for this row.
 * Hosts cannot deactivate when the page is read-only (e.g. viewing a
 * raffle they don't own), and only ACTIVE codes are deactivatable —
 * USED / EXPIRED / INACTIVE rows get no deactivate affordance.
 * @returns true when deactivation should be shown
 */
export function canDeactivate(
	code: PromoCode,
	options: { isReadOnly: boolean },
): boolean {
	const { isReadOnly } = options;
	if (isReadOnly) return false;
	const status = getPromoCodeStatus(code);
	return status === PROMO_CODE_STATUS.ACTIVE;
}

/**
 * Whether this row exposes any actions at all.
 * When it returns false the parent hides the trigger entirely so the
 * column does not render an empty dropdown button.
 * @returns true when at least one action applies
 */
export function hasRowActions(
	code: PromoCode,
	options: { isReadOnly: boolean },
): boolean {
	const { isReadOnly } = options;
	return canDeactivate(code, { isReadOnly }) || !!code.bulkId;
}

/**
 * Per-row dropdown containing Copy Batch ID and Deactivate actions.
 * Renders identically on desktop + mobile — the parent decides whether
 * to mount it based on `hasRowActions`.
 * @returns dropdown menu element
 */
export function PromoCodeRowActions({
	code,
	isReadOnly,
	onCopyBatchId,
	onRequestDeactivate,
}: PromoCodeRowActionsProps) {
	const bulkId = code.bulkId;
	const showDeactivate = canDeactivate(code, { isReadOnly });

	function handleCopyBatch() {
		if (bulkId) onCopyBatchId(bulkId);
	}

	function handleRequestDeactivate() {
		onRequestDeactivate(code);
	}

	return (
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
				{bulkId ? (
					<DropdownMenuItem onClick={handleCopyBatch}>
						<Copy className="size-4" />
						Copy Batch ID
					</DropdownMenuItem>
				) : null}
				{showDeactivate ? (
					<DropdownMenuItem
						onClick={handleRequestDeactivate}
						className="text-red-600 focus:text-red-600"
					>
						<XCircle className="size-4" />
						Deactivate
					</DropdownMenuItem>
				) : null}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
