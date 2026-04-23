'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';

import { CreatedCodesResult } from '@/components/promo-code/created-result';
import { ColoredCards } from '@/components/promo-code/create/decorations';
import { CreatePromoCodeFormFields } from '@/components/promo-code/create/form-fields';
import {
	toLocalEndOfDayIso,
	type CreatePromoCodePayload,
	type CreatePromoCodeFormData,
} from '@/components/promo-code/create/schema';
import { useCreatePromoCodeForm } from '@/components/promo-code/create/use-form';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import type { BulkCreatePromoCodesResponse } from '@/types/promo-code';

export type { CreatePromoCodePayload } from '@/components/promo-code/create/schema';
export { createPromoCodeFormSchema } from '@/components/promo-code/create/schema';

interface CreatePromoCodeModalProps {
	isOpen: boolean;
	onClose: () => void;
	onCreate: (
		data: CreatePromoCodePayload,
	) => Promise<BulkCreatePromoCodesResponse | null>;
	onExportBatch?: (bulkId: string) => void;
	allowFreeTickets: boolean;
}

interface CreatedCodesState {
	codes: string[];
	bulkId?: string;
}

/**
 * Modal for creating promo codes (single or bulk). Shell owns submit
 * state and the toggle between the form view and the post-create
 * success panel. Field bodies, the success panel, form scaffolding,
 * and schema all live in sibling files.
 */
export function CreatePromoCodeModal({
	isOpen,
	onClose,
	onCreate,
	onExportBatch,
	allowFreeTickets,
}: CreatePromoCodeModalProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [createdCodes, setCreatedCodes] = useState<CreatedCodesState | null>(
		null,
	);

	const {
		form,
		handleTypeChange,
		handleUnlimitedUsesChange,
		handleUnlimitedPerUserChange,
		handleNoExpirationChange,
	} = useCreatePromoCodeForm({ allowFreeTickets });

	const watchType = form.watch('type');
	const watchNoExpiration = form.watch('noExpiration');
	const watchUnlimitedUses = form.watch('unlimitedUses');
	const watchUnlimitedPerUser = form.watch('unlimitedPerUser');

	async function onSubmit(data: CreatePromoCodeFormData) {
		setIsSubmitting(true);
		try {
			const result = await onCreate({
				count: data.count,
				type: data.type,
				value: data.value,
				maxUses: data.unlimitedUses ? 0 : data.maxUses,
				maxRedemptionsPerUser: data.unlimitedPerUser
					? 0
					: data.maxRedemptionsPerUser,
				expiresAt:
					data.noExpiration || !data.expiresAt
						? undefined
						: toLocalEndOfDayIso(data.expiresAt),
			});
			if (result) {
				setCreatedCodes({ codes: result.codes, bulkId: result.bulkId });
			}
		} finally {
			setIsSubmitting(false);
		}
	}

	function handleClose() {
		form.reset();
		setCreatedCodes(null);
		onClose();
	}

	if (createdCodes) {
		return (
			<CreatedCodesResult
				isOpen={isOpen}
				codes={createdCodes.codes}
				bulkId={createdCodes.bulkId}
				onClose={handleClose}
				onExportBatch={onExportBatch}
			/>
		);
	}

	return (
		<Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
			<DialogContent className="border-ink-alpha max-w-md overflow-hidden border p-14">
				<ColoredCards className="absolute right-0 bottom-0 -z-1 rounded-br-xl" />

				<DialogHeader>
					<DialogTitle className="font-clash-display text-navy text-3xl font-semibold">
						Create Promo Codes
					</DialogTitle>
					<DialogDescription>
						Create promotional codes for discounts or bonus entries.
					</DialogDescription>
				</DialogHeader>

				<form
					onSubmit={event => {
						event.stopPropagation();
						form.handleSubmit(onSubmit)(event);
					}}
					className="flex flex-col gap-4"
				>
					<CreatePromoCodeFormFields
						form={form}
						allowFreeTickets={allowFreeTickets}
						watchType={watchType}
						watchUnlimitedUses={watchUnlimitedUses}
						watchUnlimitedPerUser={watchUnlimitedPerUser}
						watchNoExpiration={watchNoExpiration}
						onTypeChange={handleTypeChange}
						onUnlimitedUsesChange={handleUnlimitedUsesChange}
						onUnlimitedPerUserChange={handleUnlimitedPerUserChange}
						onNoExpirationChange={handleNoExpirationChange}
					/>

					<DialogFooter className="sm:justify-center">
						<Button
							type="submit"
							disabled={isSubmitting}
							className="font-clash-display hover:bg-background mt-2 w-full cursor-pointer border-2 border-black bg-black font-semibold hover:text-black"
						>
							{isSubmitting ? (
								<>
									<Loader2 className="size-4 animate-spin" />
									Creating...
								</>
							) : (
								'Create'
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
