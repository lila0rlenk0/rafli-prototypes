'use client';

import { Link2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui-custom/copy-button';
import {
	formatPromoCodeUsage,
	formatPromoCodeValue,
	formatUsageLimit,
} from '@/lib/utils/format/promo-code-format';
import { type PromoCode } from '@/types/promo-code';

import { hasRowActions, PromoCodeRowActions } from './row-actions';
import { PromoCodeStatusBadge } from '../status-badge';
import {
	formatExpiration,
	getTypeLabel,
	TypeIcon,
} from './promo-table-present';

/**
 * Props for PromoCodesTableRow.
 */
interface PromoCodesTableRowProps {
	code: PromoCode;
	isReadOnly: boolean;
	publicSlug?: string;
	onCopyBatchId: (bulkId: string) => void;
	onRequestDeactivate: (code: PromoCode) => void;
}

/**
 * Builds the share URL for a promo code.
 * Module-scoped so the string template is not recreated per render.
 * @returns absolute share URL
 */
function buildShareUrl(publicSlug: string, code: string): string {
	return `${window.location.origin}/browse/${publicSlug}?code=${code}`;
}

/**
 * Copies the share URL to the clipboard.
 * Lives at row scope (not on the hook) because the URL depends on
 * `publicSlug` which is row-prop — avoiding the extra argument through
 * the selection hook keeps that hook focused on lifecycle concerns.
 */
async function copyShareLink(publicSlug: string, code: string) {
	const shareUrl = buildShareUrl(publicSlug, code);
	try {
		await navigator.clipboard.writeText(shareUrl);
		toast.success('Share link copied');
	} catch {
		toast.error('Failed to copy link');
	}
}

/**
 * Single desktop `<tr>` for the promo codes table.
 * Rendered inside the parent `<tbody>` — shadcn primitive Table usage
 * is intentionally NOT introduced here to preserve the existing raw
 * `<table>` markup (task: "shadcn Table primitive usage unchanged").
 * @returns table row element
 */
export function PromoCodesTableRow({
	code,
	isReadOnly,
	publicSlug,
	onCopyBatchId,
	onRequestDeactivate,
}: PromoCodesTableRowProps) {
	function handleCopyShareLink() {
		if (publicSlug) copyShareLink(publicSlug, code.code);
	}

	return (
		<tr className="border-cool-100 border-t border-b">
			<td className="py-4">
				<div className="flex items-center gap-2">
					<span className="font-mono">{code.code}</span>
					<CopyButton value={code.code} />
					{publicSlug ? (
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={handleCopyShareLink}
							className="-ml-1 text-gray-400 hover:text-gray-600"
							title="Copy share link"
						>
							<Link2 className="size-4" />
						</Button>
					) : null}
				</div>
			</td>
			<td className="py-4">
				<div className="flex items-center gap-1.5">
					<TypeIcon type={code.type} />
					<span className="text-sm">{getTypeLabel(code.type)}</span>
				</div>
			</td>
			<td className="py-4 font-medium">{formatPromoCodeValue(code)}</td>
			<td className="py-4">{formatPromoCodeUsage(code)}</td>
			<td className="py-4">{formatUsageLimit(code.maxRedemptionsPerUser)}</td>
			<td className="py-4">
				<PromoCodeStatusBadge code={code} />
			</td>
			<td className="py-4">{formatExpiration(code.expiresAt)}</td>
			<td className="py-4 text-right">
				{hasRowActions(code, { isReadOnly }) ? (
					<PromoCodeRowActions
						code={code}
						isReadOnly={isReadOnly}
						onCopyBatchId={onCopyBatchId}
						onRequestDeactivate={onRequestDeactivate}
					/>
				) : null}
			</td>
		</tr>
	);
}
