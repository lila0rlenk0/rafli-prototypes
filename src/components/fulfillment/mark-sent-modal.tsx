'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type ComponentProps, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useTimeout } from '@/lib/hooks/use-timeout';
import { DIALOG_EXIT_ANIMATION_MS } from '@/lib/utils/ui-constants';

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
import { markSent } from '@/services/winning/mark-sent';
import type { Winning } from '@/types/winning';

const formSchema = z.object({
	proofUrl: z
		.string()
		.url('Please enter a valid URL')
		.max(512)
		.refine(
			url => /^https?:\/\//i.test(url),
			'Only HTTP and HTTPS URLs are allowed',
		),
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
	/** Public slug used for revalidation after mutation */
	publicSlug: string;
	/** Callback when mark sent is successful — receives updated winning from backend */
	onSuccess: (winning: Winning) => void;
}

export function MarkSentModal({
	open,
	onOpenChange,
	winningId,
	publicSlug,
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
	const setCloseTimeout = useTimeout();

	function handleMarkSent(data: FormType) {
		startTransition(async () => {
			const result = await markSent(
				winningId,
				{
					proofUrl: data.proofUrl,
					hostNotes: data.hostNotes,
				},
				publicSlug,
			);

			if (!result.success) {
				toast.error('Failed to mark as sent. Please try again.');
				return;
			}

			toast.success('Prize marked as shipped!');
			onSuccess(result.data);
			handleOpenChange(false);
		});
	}

	const handleOpenChange = (newOpen: boolean) => {
		if (!newOpen) {
			// Reset form after Dialog close animation completes
			setCloseTimeout(() => {
				reset();
			}, DIALOG_EXIT_ANIMATION_MS);
		}
		onOpenChange(newOpen);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="border-ink-alpha max-w-2xl overflow-hidden border bg-white px-16 py-12">
				<LeftColoredCard className="absolute top-0 left-0" />
				<RightColoredCard className="absolute top-0 right-0" />

				<DialogHeader className="z-1 flex flex-col items-center justify-center gap-2">
					<div className="flex justify-center pb-4">
						<ShippingIcon />
					</div>
					<DialogTitle className="font-clash-display text-3xl">
						Mark as Shipped
					</DialogTitle>
					<DialogDescription className="text-center text-black">
						Provide tracking or proof of shipment for the winner.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit(handleMarkSent)} className="z-1">
					<FieldGroup className="flex flex-col gap-4">
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
								className="border-input placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
								aria-invalid={!!errors.hostNotes}
								{...register('hostNotes')}
							/>
							<FieldError errors={[errors.hostNotes]} />
						</Field>

						<Button type="submit" disabled={isPending} className="mt-4 w-full">
							{isPending ? 'Marking...' : 'Mark as Shipped'}
						</Button>
					</FieldGroup>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function ShippingIcon(props: ComponentProps<'svg'>) {
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
				d="M70 36.6667H63.3333V26.6667C63.3333 25.7826 62.9821 24.9348 62.357 24.3096C61.7319 23.6845 60.8841 23.3333 60 23.3333H6.66667C5.78261 23.3333 4.93477 23.6845 4.30964 24.3096C3.68452 24.9348 3.33333 25.7826 3.33333 26.6667V56.6667C3.33333 57.5507 3.68452 58.3986 4.30964 59.0237C4.93477 59.6488 5.78261 60 6.66667 60H10C10 63.5362 11.4048 66.9276 13.9052 69.4281C16.4057 71.9286 19.7971 73.3333 23.3333 73.3333C26.8696 73.3333 30.2609 71.9286 32.7614 69.4281C35.2619 66.9276 36.6667 63.5362 36.6667 60H46.6667C46.6667 63.5362 48.0714 66.9276 50.5719 69.4281C53.0724 71.9286 56.4638 73.3333 60 73.3333C63.5362 73.3333 66.9276 71.9286 69.4281 69.4281C71.9286 66.9276 73.3333 63.5362 73.3333 60H76.6667C77.5507 60 78.3986 59.6488 79.0237 59.0237C79.6488 58.3986 80 57.5507 80 56.6667V46.6667C80 43.0174 78.5505 39.5174 76.0167 36.9833C73.4829 34.4495 69.9826 33 66.3333 33H70V36.6667ZM23.3333 66.6667C21.6797 66.6667 20.0962 66.0345 18.9281 64.8719C17.7655 63.7038 17.1333 62.1203 17.1333 60.4667C17.1333 58.813 17.7655 57.2295 18.9281 56.0614C20.0962 54.8988 21.6797 54.2667 23.3333 54.2667C24.987 54.2667 26.5705 54.8988 27.7386 56.0614C28.9012 57.2295 29.5333 58.813 29.5333 60.4667C29.5333 62.1203 28.9012 63.7038 27.7386 64.8719C26.5705 66.0345 24.987 66.6667 23.3333 66.6667ZM60 66.6667C58.3464 66.6667 56.7629 66.0345 55.5948 64.8719C54.4321 63.7038 53.8 62.1203 53.8 60.4667C53.8 58.813 54.4321 57.2295 55.5948 56.0614C56.7629 54.8988 58.3464 54.2667 60 54.2667C61.6536 54.2667 63.2371 54.8988 64.4052 56.0614C65.5679 57.2295 66.2 58.813 66.2 60.4667C66.2 62.1203 65.5679 63.7038 64.4052 64.8719C63.2371 66.0345 61.6536 66.6667 60 66.6667ZM63.3333 43.3333V40H66.6667C68.2246 40 69.7189 40.6185 70.8191 41.7187C71.9193 42.8189 72.5333 44.3087 72.5333 45.8667V46.6667H63.3333V43.3333ZM10 53.3333V30H56.6667V53.3333H10Z"
				fill="black"
			/>
		</svg>
	);
}

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
