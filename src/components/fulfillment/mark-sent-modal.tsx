'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { markSent } from '@/services/winning/mark-sent';

const formSchema = z.object({
	proofUrl: z.string().url('Please enter a valid URL').max(512),
	hostNotes: z.string().max(2_000).optional(),
});

type FormType = z.infer<typeof formSchema>;

interface MarkSentModalProps {
	/** Whether the modal is open */
	open: boolean;
	/** Callback when modal open state changes */
	onOpenChange: (open: boolean) => void;
	/** The winning ID to mark as sent */
	winningId: string;
	/** Callback when mark sent is successful */
	onSuccess: () => void;
}

/**
 * MarkSentModal Component
 *
 * Modal for host to mark prize as shipped with tracking/proof URL.
 */
export function MarkSentModal({
	open,
	onOpenChange,
	winningId,
	onSuccess,
}: MarkSentModalProps) {
	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
	} = useForm<FormType>({
		resolver: zodResolver(formSchema),
	});
	const [isPending, startTransition] = useTransition();

	/**
	 * Handles form submission
	 */
	function handleMarkSent(data: FormType) {
		startTransition(async () => {
			const result = await markSent(winningId, {
				proofUrl: data.proofUrl,
				hostNotes: data.hostNotes,
			});

			if (!result.success) {
				toast.error('Failed to mark as sent. Please try again.');
				return;
			}

			toast.success('Prize marked as shipped!');
			onSuccess();
			handleOpenChange(false);
		});
	}

	/**
	 * Resets form state when modal closes
	 */
	function handleOpenChange(newOpen: boolean) {
		if (!newOpen) {
			setTimeout(() => {
				reset();
			}, 200);
		}
		onOpenChange(newOpen);
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="font-clash-display text-2xl">
						Mark as Shipped
					</DialogTitle>
					<DialogDescription>
						Provide tracking or proof of shipment for the winner.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit(handleMarkSent)}>
					<FieldGroup className="space-y-4">
						<Field>
							<FieldLabel htmlFor="proofUrl">Tracking / Proof URL</FieldLabel>
							<Input
								id="proofUrl"
								placeholder="https://tracking.example.com/..."
								aria-invalid={!!errors.proofUrl}
								{...register('proofUrl')}
							/>
							<FieldError errors={[errors.proofUrl]} />
						</Field>

						<Field>
							<FieldLabel htmlFor="hostNotes">
								Notes <span className="text-gray-400">(optional)</span>
							</FieldLabel>
							<textarea
								id="hostNotes"
								placeholder="Any additional information for the winner..."
								className="border-input placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50"
								aria-invalid={!!errors.hostNotes}
								{...register('hostNotes')}
							/>
							<FieldError errors={[errors.hostNotes]} />
						</Field>

						<Button
							type="submit"
							disabled={isPending}
							className="mt-4 w-full"
						>
							{isPending ? 'Marking...' : 'Mark as Shipped'}
						</Button>
					</FieldGroup>
				</form>
			</DialogContent>
		</Dialog>
	);
}
