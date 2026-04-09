'use client';

import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import type { PromoCode } from '@/types/promo-code';

/**
 * Props for DeactivatePromoCodeModal
 */
interface DeactivatePromoCodeModalProps {
	code: PromoCode | null;
	isOpen: boolean;
	isLoading: boolean;
	onClose: () => void;
	onConfirm: () => void;
}

/**
 * Confirmation modal for deactivating a promo code
 */
export function DeactivatePromoCodeModal({
	code,
	isOpen,
	isLoading,
	onClose,
	onConfirm,
}: DeactivatePromoCodeModalProps) {
	return (
		<Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
			<DialogContent className="max-w-md p-14">
				<DialogHeader>
					<DialogTitle>Deactivate Promo Code?</DialogTitle>
					<DialogDescription>
						Code &ldquo;{code?.code}&rdquo; will no longer be redeemable. This
						action cannot be undone.
					</DialogDescription>
				</DialogHeader>

				<DialogFooter className="gap-2 sm:gap-0">
					<Button variant="outline" onClick={onClose} disabled={isLoading}>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={onConfirm}
						disabled={isLoading}
					>
						{isLoading ? (
							<>
								<Loader2 className="size-4 animate-spin" />
								Deactivating...
							</>
						) : (
							'Deactivate'
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
