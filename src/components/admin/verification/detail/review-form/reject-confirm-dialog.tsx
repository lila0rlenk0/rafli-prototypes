'use client';

import { Loader2 } from 'lucide-react';
import type { ChangeEvent } from 'react';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface RejectConfirmDialogProps {
	open: boolean;
	isPending: boolean;
	rejectionReason: string;
	maxLength: number;
	onOpenChange: (open: boolean) => void;
	onReasonChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
	onConfirm: () => void;
	onCancel: () => void;
}

/**
 * Reject confirmation dialog — captures the required rejection reason
 * and surfaces a character counter. The reason is shown back to the
 * user on their submission, so empty input is blocked upstream.
 */
export function RejectConfirmDialog({
	open,
	isPending,
	rejectionReason,
	maxLength,
	onOpenChange,
	onReasonChange,
	onConfirm,
	onCancel,
}: RejectConfirmDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Reject Submission?</DialogTitle>
					<DialogDescription>
						Provide a reason — it will be shown to the user so they know what to
						fix when resubmitting.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-1">
					<Textarea
						placeholder="Rejection reason (required)"
						value={rejectionReason}
						onChange={onReasonChange}
						maxLength={maxLength}
						className="min-h-24"
						disabled={isPending}
					/>
					<span className="text-muted-foreground text-right text-xs">
						{rejectionReason.length}/{maxLength}
					</span>
				</div>

				<DialogFooter className="gap-2">
					<Button variant="outline" onClick={onCancel} disabled={isPending}>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={onConfirm}
						disabled={isPending}
					>
						{isPending ? (
							<>
								<Loader2 className="size-4 animate-spin" />
								Rejecting...
							</>
						) : (
							'Reject'
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
