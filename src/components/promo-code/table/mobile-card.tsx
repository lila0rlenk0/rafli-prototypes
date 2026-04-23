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
 * Props for PromoCodesTableMobileCard.
 */
interface PromoCodesTableMobileCardProps {
	code: PromoCode;
	isReadOnly: boolean;
	publicSlug?: string;
	onCopyBatchId: (bulkId: string) => void;
	onRequestDeactivate: (code: PromoCode) => void;
}

/**
 * Copies the public share URL — duplicated from the desktop row so the
 * mobile card remains a standalone module. Cheap to duplicate (two
 * lines of side-effects); the alternative would be lifting clipboard
 * helpers into the selection hook which pollutes that hook's scope.
 */
async function copyShareLink(publicSlug: string, code: string) {
	const shareUrl = `${window.location.origin}/browse/${publicSlug}?code=${code}`;
	try {
		await navigator.clipboard.writeText(shareUrl);
		toast.success('Share link copied');
	} catch {
		toast.error('Failed to copy link');
	}
}

/**
 * Renders the expiration suffix shown in the mobile metadata row.
 * Keeps the JSX flat; the ternary variant would require nesting or a
 * template literal inside JSX.
 * @returns trailing expiration copy
 */
function formatMobileExpirationSuffix(expiresAt: string | null): string {
	if (expiresAt) return ` • Expires ${formatExpiration(expiresAt)}`;
	return ' • Never expires';
}

/**
 * Mobile-only card variant for a single promo code.
 * Shown below the `md` breakpoint where the desktop table is hidden.
 * @returns card element
 */
export function PromoCodesTableMobileCard({
	code,
	isReadOnly,
	publicSlug,
	onCopyBatchId,
	onRequestDeactivate,
}: PromoCodesTableMobileCardProps) {
	function handleCopyShareLink() {
		if (publicSlug) copyShareLink(publicSlug, code.code);
	}

	return (
		<div className="rounded-lg border border-gray-200 bg-white p-4">
			<div className="flex items-start justify-between">
				<div className="flex items-center gap-2">
					<span className="font-mono font-medium">{code.code}</span>
					<CopyButton value={code.code} size="sm" />
					{publicSlug ? (
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={handleCopyShareLink}
							className="text-gray-400 hover:text-gray-600"
							title="Copy share link"
						>
							<Link2 className="size-3.5" />
						</Button>
					) : null}
				</div>
				{hasRowActions(code, { isReadOnly }) ? (
					<PromoCodeRowActions
						code={code}
						isReadOnly={isReadOnly}
						onCopyBatchId={onCopyBatchId}
						onRequestDeactivate={onRequestDeactivate}
					/>
				) : null}
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
				{formatMobileExpirationSuffix(code.expiresAt)}
			</div>
		</div>
	);
}
