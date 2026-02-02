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
import { claimWinning } from '@/services/winning/claim-winning';

const formSchema = z.object({
	name: z.string().min(1, 'Name is required').max(100),
	address: z.string().min(1, 'Address is required').max(500),
	city: z.string().min(1, 'City is required').max(100),
	zip: z.string().min(1, 'ZIP code is required').max(20),
	country: z.string().min(1, 'Country is required').max(100),
	phone: z.string().max(30).optional(),
});

type FormType = z.infer<typeof formSchema>;

interface ShippingFormModalProps {
	/** Whether the modal is open */
	open: boolean;
	/** Callback when modal open state changes */
	onOpenChange: (open: boolean) => void;
	/** The raffle ID to claim */
	raffleId: string;
	/** Callback when claim is successful */
	onSuccess: () => void;
}

/**
 * ShippingFormModal Component
 *
 * Modal for winner to submit their shipping address to claim the prize.
 */
export function ShippingFormModal({
	open,
	onOpenChange,
	raffleId,
	onSuccess,
}: ShippingFormModalProps) {
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
	function handleClaim(data: FormType) {
		startTransition(async () => {
			const result = await claimWinning(raffleId, {
				claimType: 'shipping',
				shippingInfo: {
					name: data.name,
					address: data.address,
					city: data.city,
					zip: data.zip,
					country: data.country,
					phone: data.phone,
				},
			});

			if (!result.success) {
				toast.error('Failed to submit shipping info. Please try again.');
				return;
			}

			toast.success('Shipping info submitted successfully!');
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
						Claim Your Prize
					</DialogTitle>
					<DialogDescription>
						Enter your shipping address to receive your prize.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit(handleClaim)}>
					<FieldGroup className="space-y-4">
						<Field>
							<FieldLabel htmlFor="name">Full Name</FieldLabel>
							<Input
								id="name"
								placeholder="John Doe"
								aria-invalid={!!errors.name}
								{...register('name')}
							/>
							<FieldError errors={[errors.name]} />
						</Field>

						<Field>
							<FieldLabel htmlFor="address">Address</FieldLabel>
							<Input
								id="address"
								placeholder="123 Main St, Apt 4"
								aria-invalid={!!errors.address}
								{...register('address')}
							/>
							<FieldError errors={[errors.address]} />
						</Field>

						<div className="grid grid-cols-2 gap-4">
							<Field>
								<FieldLabel htmlFor="city">City</FieldLabel>
								<Input
									id="city"
									placeholder="New York"
									aria-invalid={!!errors.city}
									{...register('city')}
								/>
								<FieldError errors={[errors.city]} />
							</Field>

							<Field>
								<FieldLabel htmlFor="zip">ZIP Code</FieldLabel>
								<Input
									id="zip"
									placeholder="10001"
									aria-invalid={!!errors.zip}
									{...register('zip')}
								/>
								<FieldError errors={[errors.zip]} />
							</Field>
						</div>

						<Field>
							<FieldLabel htmlFor="country">Country</FieldLabel>
							<Input
								id="country"
								placeholder="United States"
								aria-invalid={!!errors.country}
								{...register('country')}
							/>
							<FieldError errors={[errors.country]} />
						</Field>

						<Field>
							<FieldLabel htmlFor="phone">
								Phone <span className="text-gray-400">(optional)</span>
							</FieldLabel>
							<Input
								id="phone"
								placeholder="+1 555 123 4567"
								aria-invalid={!!errors.phone}
								{...register('phone')}
							/>
							<FieldError errors={[errors.phone]} />
						</Field>

						<Button
							type="submit"
							disabled={isPending}
							className="mt-4 w-full"
						>
							{isPending ? 'Submitting...' : 'Submit Shipping Info'}
						</Button>
					</FieldGroup>
				</form>
			</DialogContent>
		</Dialog>
	);
}
