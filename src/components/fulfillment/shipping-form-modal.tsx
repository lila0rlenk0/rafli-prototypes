'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ComponentProps, useTransition } from 'react';
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
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { claimWinning } from '@/services/winning/claim-winning';
import type { Winning } from '@/types/winning';

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
	/** Public slug used for revalidation after mutation */
	publicSlug: string;
	/** Callback when claim is successful — receives updated winning from backend */
	onSuccess: (winning: Winning) => void;
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
	publicSlug,
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
			const result = await claimWinning(
				raffleId,
				{
					claimType: 'shipping',
					shippingInfo: {
						name: data.name,
						address: data.address,
						city: data.city,
						zip: data.zip,
						country: data.country,
						phone: data.phone,
					},
				},
				publicSlug,
			);

			if (!result.success) {
				toast.error('Failed to submit shipping info. Please try again.');
				return;
			}

			toast.success('Shipping info submitted successfully!');
			onSuccess(result.data);
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
			<DialogContent className="max-w-2xl overflow-hidden border border-[#0F0F0FF2] bg-white px-16 py-12">
				<LeftColoredCard className="absolute top-0 left-0" />
				<RightColoredCard className="absolute top-0 right-0" />

				<DialogHeader className="z-1 flex items-center justify-center space-y-2">
					<div className="flex justify-center pb-4">
						<TrophyIcon />
					</div>
					<DialogTitle className="font-clash-display text-3xl">
						Claim Your Prize
					</DialogTitle>
					<DialogDescription className="text-center text-black">
						Enter your shipping address to receive your prize.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit(handleClaim)} className="z-1">
					<FieldGroup className="gap-4">
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

						<Button type="submit" disabled={isPending} className="mt-4 w-full">
							{isPending ? 'Submitting...' : 'Submit Shipping Info'}
						</Button>
					</FieldGroup>
				</form>
			</DialogContent>
		</Dialog>
	);
}

/**
 * Trophy icon for prize claim modal
 */
function TrophyIcon(props: ComponentProps<'svg'>) {
	return (
		<svg
			width="80"
			height="80"
			viewBox="0 0 80 80"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M66.6667 10H60V6.66667C60 5.78261 59.6488 4.93477 59.0237 4.30964C58.3986 3.68452 57.5507 3.33333 56.6667 3.33333H23.3333C22.4493 3.33333 21.6014 3.68452 20.9763 4.30964C20.3512 4.93477 20 5.78261 20 6.66667V10H13.3333C12.4493 10 11.6014 10.3512 10.9763 10.9763C10.3512 11.6014 10 12.4493 10 13.3333V20C10 24.4203 11.7559 28.6595 14.8816 31.7851C18.0072 34.9107 22.2464 36.6667 26.6667 36.6667H27.5C29.1333 41.1333 32.3333 44.8333 36.6667 47.0667V56.6667H30C28.2319 56.6667 26.5362 57.3691 25.286 58.6193C24.0357 59.8695 23.3333 61.5652 23.3333 63.3333V73.3333C23.3333 74.2174 23.6845 75.0652 24.3096 75.6904C24.9348 76.3155 25.7826 76.6667 26.6667 76.6667H53.3333C54.2174 76.6667 55.0652 76.3155 55.6904 75.6904C56.3155 75.0652 56.6667 74.2174 56.6667 73.3333V63.3333C56.6667 61.5652 55.9643 59.8695 54.714 58.6193C53.4638 57.3691 51.7681 56.6667 50 56.6667H43.3333V47.0667C47.6667 44.8333 50.8667 41.1333 52.5 36.6667H53.3333C57.7536 36.6667 61.9928 34.9107 65.1184 31.7851C68.2441 28.6595 70 24.4203 70 20V13.3333C70 12.4493 69.6488 11.6014 69.0237 10.9763C68.3986 10.3512 67.5507 10 66.6667 10ZM26.6667 30C24.8986 30 23.2029 29.2976 21.9526 28.0474C20.7024 26.7971 20 25.1014 20 23.3333V16.6667H26.6667V30ZM50 63.3333V70H30V63.3333H50ZM53.3333 30V10H26.6667V30C26.6667 33.5362 28.0714 36.9276 30.5719 39.4281C33.0724 41.9286 36.4638 43.3333 40 43.3333C43.5362 43.3333 46.9276 41.9286 49.4281 39.4281C51.9286 36.9276 53.3333 33.5362 53.3333 30ZM60 23.3333C60 25.1014 59.2976 26.7971 58.0474 28.0474C56.7971 29.2976 55.1014 30 53.3333 30V16.6667H60V23.3333Z"
				fill="black"
			/>
		</svg>
	);
}

/**
 * Left decorative colored cards SVG
 */
function LeftColoredCard(props: ComponentProps<'svg'>) {
	return (
		<svg
			width="260"
			height="310"
			viewBox="0 0 260 310"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M98.6845 -13.471C93.3861 -13.5194 89.0448 -9.45478 88.988 -4.3925L87.3677 140.035C87.3109 145.098 91.5601 149.241 96.8585 149.289L248.025 150.669C253.323 150.718 257.664 146.653 257.721 141.591L259.342 -2.83684C259.398 -7.89912 255.149 -12.0421 249.851 -12.0905L98.6845 -13.471Z"
				fill="#C4EDFF"
			/>
			<path
				d="M-13.1583 42.0779C-18.3784 42.9529 -21.8726 47.7045 -20.9629 52.6908L12.2685 234.828C13.1782 239.814 18.1475 243.147 23.3675 242.272L214.043 210.311C219.263 209.436 222.758 204.685 221.848 199.698L188.617 17.5611C187.707 12.5748 182.738 9.24188 177.517 10.1169L-13.1583 42.0779Z"
				fill="#BEFFDB"
			/>
			<path
				d="M35.0622 90.1197C31.3558 86.506 25.2814 86.4505 21.4947 89.9958L-86.5417 191.146C-90.3285 194.691 -90.3936 200.495 -86.6872 204.108L19.0578 307.21C22.7642 310.824 28.8386 310.88 32.6253 307.334L140.662 206.185C144.448 202.639 144.514 196.836 140.807 193.222L35.0622 90.1197Z"
				fill="#F6FF8B"
			/>
		</svg>
	);
}

/**
 * Right decorative colored cards SVG
 */
function RightColoredCard(props: ComponentProps<'svg'>) {
	return (
		<svg
			width="259"
			height="312"
			viewBox="0 0 259 312"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M160.657 -11.5633C165.956 -11.6116 170.297 -7.54707 170.354 -2.48479L171.974 141.943C172.031 147.005 167.782 151.148 162.483 151.197L11.3171 152.577C6.01861 152.626 1.6773 148.561 1.6205 143.499L0.000196564 -0.929127C-0.0566037 -5.99141 4.19263 -10.1344 9.49109 -10.1828L160.657 -11.5633Z"
				fill="#C4EDFF"
			/>
			<path
				d="M272.5 43.9856C277.72 44.8606 281.214 49.6122 280.305 54.5985L247.073 236.736C246.164 241.722 241.194 245.055 235.974 244.18L45.2985 212.219C40.0784 211.344 36.5842 206.592 37.494 201.606L70.7253 19.4688C71.6351 14.4825 76.6043 11.1496 81.8243 12.0246L272.5 43.9856Z"
				fill="#BEFFDB"
			/>
			<path
				d="M224.28 92.0275C227.986 88.4137 234.06 88.3582 237.847 91.9035L345.884 193.053C349.67 196.599 349.735 202.402 346.029 206.016L240.284 309.118C236.578 312.732 230.503 312.787 226.716 309.242L118.68 208.092C114.893 204.547 114.828 198.743 118.535 195.129L224.28 92.0275Z"
				fill="#F6FF8B"
			/>
		</svg>
	);
}
