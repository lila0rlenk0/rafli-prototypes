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

interface ApproveConfirmDialogProps {
	open: boolean;
	isPending: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	onCancel: () => void;
}

/**
 * Approve confirmation dialog — single CTA, no payload. Split out from
 * the review form so the form shell stays focused on state
 * orchestration.
 */
export function ApproveConfirmDialog({
	open,
	isPending,
	onOpenChange,
	onConfirm,
	onCancel,
}: ApproveConfirmDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Approve Submission?</DialogTitle>
					<DialogDescription>
						This will verify the user and grant them access to the associated
						features. This action can be reversed by rejecting later.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className="gap-2">
					<Button variant="outline" onClick={onCancel} disabled={isPending}>
						Cancel
					</Button>
					<Button onClick={onConfirm} disabled={isPending}>
						{isPending ? (
							<>
								<Loader2 className="size-4 animate-spin" />
								Approving...
							</>
						) : (
							'Approve'
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
