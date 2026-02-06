'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Copy, Download, Loader2 } from 'lucide-react';
import { ComponentProps, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import {
	type BulkCreatePromoCodesResponse,
	PROMO_CODE_TYPE,
	type PromoCodeType,
} from '@/types/promo-code';

/**
 * Form schema for creating promo codes
 */
const createPromoCodeFormSchema = z
	.object({
		count: z.number().int().min(1).max(100),
		type: z.enum([
			PROMO_CODE_TYPE.FREE_TICKETS,
			PROMO_CODE_TYPE.DISCOUNT_FIXED,
			PROMO_CODE_TYPE.DISCOUNT_PERCENT,
		]),
		value: z.number().positive('Value must be positive'),
		maxUses: z.number().int().min(0).max(10_000),
		noExpiration: z.boolean(),
		expiresAt: z.string().optional(),
	})
	.refine(
		data => {
			if (data.type === PROMO_CODE_TYPE.DISCOUNT_PERCENT) {
				return data.value >= 1 && data.value <= 100;
			}
			return true;
		},
		{ message: 'Percentage must be between 1 and 100', path: ['value'] },
	)
	.refine(
		data => {
			if (data.type === PROMO_CODE_TYPE.FREE_TICKETS) {
				return Number.isInteger(data.value);
			}
			return true;
		},
		{ message: 'Tickets must be a whole number', path: ['value'] },
	)
	.refine(
		data => {
			if (data.noExpiration) {
				return true;
			}
			return !!data.expiresAt;
		},
		{ message: 'Expiration date is required', path: ['expiresAt'] },
	);

type CreatePromoCodeFormData = z.infer<typeof createPromoCodeFormSchema>;

/**
 * Data for creating promo codes
 */
export interface CreatePromoCodeData {
	count: number;
	type: PromoCodeType;
	value: number;
	maxUses: number;
	expiresAt?: string;
}

/**
 * Props for CreatePromoCodeModal
 */
interface CreatePromoCodeModalProps {
	isOpen: boolean;
	onClose: () => void;
	onCreate: (
		data: CreatePromoCodeData,
	) => Promise<BulkCreatePromoCodesResponse | null>;
	onExportBatch?: (bulkId: string) => void;
	allowFreeTickets: boolean;
}

/**
 * Modal for creating promo codes (supports single and bulk creation)
 */
export function CreatePromoCodeModal({
	isOpen,
	onClose,
	onCreate,
	onExportBatch,
	allowFreeTickets,
}: CreatePromoCodeModalProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [createdCodes, setCreatedCodes] = useState<{
		codes: string[];
		bulkId?: string;
	} | null>(null);
	const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
	const [copiedAll, setCopiedAll] = useState(false);

	const form = useForm<CreatePromoCodeFormData>({
		resolver: zodResolver(createPromoCodeFormSchema),
		defaultValues: {
			count: 1,
			type: allowFreeTickets
				? PROMO_CODE_TYPE.FREE_TICKETS
				: PROMO_CODE_TYPE.DISCOUNT_FIXED,
			value: 1,
			maxUses: 1,
			noExpiration: true,
			expiresAt: undefined,
		},
	});

	const watchType = form.watch('type');
	const watchNoExpiration = form.watch('noExpiration');

	useEffect(() => {
		if (!allowFreeTickets && watchType === PROMO_CODE_TYPE.FREE_TICKETS) {
			form.setValue('type', PROMO_CODE_TYPE.DISCOUNT_FIXED);
		}
	}, [allowFreeTickets, watchType, form]);

	/**
	 * Returns label for value input based on type
	 */
	function getValueLabel(): string {
		switch (watchType) {
			case PROMO_CODE_TYPE.FREE_TICKETS:
				return 'Number of tickets';
			case PROMO_CODE_TYPE.DISCOUNT_FIXED:
				return 'Discount amount ($)';
			case PROMO_CODE_TYPE.DISCOUNT_PERCENT:
				return 'Discount percentage (%)';
			default:
				return 'Value';
		}
	}

	/**
	 * Returns step for value input based on type
	 */
	function getValueStep(): string {
		switch (watchType) {
			case PROMO_CODE_TYPE.FREE_TICKETS:
				return '1';
			case PROMO_CODE_TYPE.DISCOUNT_FIXED:
				return '0.01';
			case PROMO_CODE_TYPE.DISCOUNT_PERCENT:
				return '1';
			default:
				return '1';
		}
	}

	/**
	 * Handles form submission
	 */
	async function onSubmit(data: CreatePromoCodeFormData) {
		setIsSubmitting(true);
		try {
			// Step 1: Normalize payload and call create.
			const result = await onCreate({
				count: data.count,
				type: data.type,
				value: data.value,
				maxUses: data.maxUses,
				expiresAt:
					data.noExpiration || !data.expiresAt
						? undefined
						: toLocalEndOfDayIso(data.expiresAt),
			});

			if (result) {
				// Step 2: Store created codes for success state.
				setCreatedCodes({ codes: result.codes, bulkId: result.bulkId });
			}
		} finally {
			setIsSubmitting(false);
		}
	}

	/**
	 * Converts YYYY-MM-DD to local end-of-day ISO string
	 */
	function toLocalEndOfDayIso(dateString: string): string {
		const [year, month, day] = dateString.split('-').map(Number);
		const localEndOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
		return localEndOfDay.toISOString();
	}

	/**
	 * Copies a single code to clipboard
	 */
	async function handleCopyCode(code: string, index: number) {
		await navigator.clipboard.writeText(code);
		setCopiedIndex(index);
		setTimeout(() => setCopiedIndex(null), 2_000);
	}

	/**
	 * Copies all codes to clipboard
	 */
	async function handleCopyAll() {
		if (!createdCodes) return;
		await navigator.clipboard.writeText(createdCodes.codes.join('\n'));
		setCopiedAll(true);
		setTimeout(() => setCopiedAll(false), 2_000);
	}

	/**
	 * Handles modal close and reset
	 */
	function handleClose() {
		form.reset();
		setCreatedCodes(null);
		setCopiedIndex(null);
		setCopiedAll(false);
		onClose();
	}

	// Success state
	if (createdCodes) {
		const isSingle = createdCodes.codes.length === 1;
		const maxDisplayCodes = 10;
		const displayedCodes = createdCodes.codes.slice(0, maxDisplayCodes);
		const remainingCount = createdCodes.codes.length - maxDisplayCodes;

		return (
			<Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
				<DialogContent className="max-w-sm overflow-hidden border border-[#0F0F0FF2] text-center">
					<ColoredCards className="absolute right-0 bottom-0 -z-1 rounded-br-xl" />

					<DialogHeader className="items-center">
						<div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-green-100">
							<Check className="size-6 text-green-600" />
						</div>
						<DialogTitle className="font-clash-display text-3xl font-semibold text-[#182135]">
							{isSingle
								? 'Promo Code Created!'
								: `${createdCodes.codes.length} Codes Created!`}
						</DialogTitle>
					</DialogHeader>

					<div className="my-4 space-y-2">
						{isSingle ? (
							<button
								type="button"
								onClick={() => handleCopyCode(createdCodes.codes[0], 0)}
								className={cn(
									'mx-auto flex items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-3',
									'transition-colors hover:border-gray-400 hover:bg-gray-50',
								)}
							>
								<span className="font-mono text-lg font-bold">
									{createdCodes.codes[0]}
								</span>
								{copiedIndex === 0 ? (
									<Check className="size-4 text-green-600" />
								) : (
									<Copy className="size-4 text-gray-400" />
								)}
							</button>
						) : (
							<>
								<div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2">
									{displayedCodes.map((code, index) => (
										<button
											key={code}
											type="button"
											onClick={() => handleCopyCode(code, index)}
											className={cn(
												'flex w-full items-center justify-between rounded px-2 py-1',
												'transition-colors hover:bg-gray-100',
											)}
										>
											<span className="font-mono text-sm">{code}</span>
											{copiedIndex === index ? (
												<Check className="size-3 text-green-600" />
											) : (
												<Copy className="size-3 text-gray-400" />
											)}
										</button>
									))}
								</div>
								{remainingCount > 0 && (
									<p className="text-xs text-gray-500">
										+{remainingCount} more code{remainingCount !== 1 ? 's' : ''}{' '}
										(use Copy All or Export)
									</p>
								)}
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={handleCopyAll}
										className="flex-1"
									>
										{copiedAll ? (
											<>
												<Check className="size-4" />
												Copied!
											</>
										) : (
											<>
												<Copy className="size-4" />
												Copy All
											</>
										)}
									</Button>
									{createdCodes.bulkId && onExportBatch && (
										<Button
											variant="outline"
											size="sm"
											onClick={() => onExportBatch(createdCodes.bulkId!)}
											className="flex-1"
										>
											<Download className="size-4" />
											Export Batch
										</Button>
									)}
								</div>
							</>
						)}
					</div>

					<Button onClick={handleClose} className="w-full">
						Done
					</Button>
				</DialogContent>
			</Dialog>
		);
	}

	// Form state
	return (
		<Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
			<DialogContent className="max-w-md overflow-hidden border border-[#0F0F0FF2]">
				<ColoredCards className="absolute right-0 bottom-0 -z-1 rounded-br-xl" />

				<DialogHeader>
					<DialogTitle className="font-clash-display text-3xl font-semibold text-[#182135]">
						Create Promo Codes
					</DialogTitle>
					<DialogDescription>
						Create promotional codes for discounts or free tickets.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					{/* Count Input */}
					<div className="space-y-2">
						<Label htmlFor="count">Number of codes</Label>
						<Input
							id="count"
							type="number"
							min={1}
							max={100}
							{...form.register('count', { valueAsNumber: true })}
						/>
						{form.formState.errors.count && (
							<p className="text-sm text-red-500">
								{form.formState.errors.count.message}
							</p>
						)}
						<p className="text-xs text-gray-500">
							Generate 1-100 codes at once
						</p>
					</div>

					{/* Type Selection */}
					<div className="space-y-2">
						<Label>Type</Label>
						<RadioGroup
							value={watchType}
							onValueChange={value =>
								form.setValue('type', value as PromoCodeType)
							}
							className="flex gap-4"
						>
							<div className="flex items-center space-x-2">
								<RadioGroupItem
									value={PROMO_CODE_TYPE.FREE_TICKETS}
									id="free_tickets"
									disabled={!allowFreeTickets}
								/>
								<Label
									htmlFor="free_tickets"
									className={cn(
										'cursor-pointer',
										!allowFreeTickets && 'text-gray-400',
									)}
								>
									Free Tickets
								</Label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem
									value={PROMO_CODE_TYPE.DISCOUNT_FIXED}
									id="discount_fixed"
								/>
								<Label htmlFor="discount_fixed" className="cursor-pointer">
									Fixed ($)
								</Label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem
									value={PROMO_CODE_TYPE.DISCOUNT_PERCENT}
									id="discount_percent"
								/>
								<Label htmlFor="discount_percent" className="cursor-pointer">
									Percent (%)
								</Label>
							</div>
						</RadioGroup>
						{!allowFreeTickets && (
							<p className="text-xs text-gray-500">
								Free tickets require a raffle question.
							</p>
						)}
					</div>

					{/* Value Input */}
					<div className="space-y-2">
						<Label htmlFor="value">{getValueLabel()}</Label>
						<Input
							id="value"
							type="number"
							step={getValueStep()}
							min={1}
							max={
								watchType === PROMO_CODE_TYPE.DISCOUNT_PERCENT ? 100 : 10_000
							}
							{...form.register('value', { valueAsNumber: true })}
						/>
						{form.formState.errors.value && (
							<p className="text-sm text-red-500">
								{form.formState.errors.value.message}
							</p>
						)}
					</div>

					{/* Max Uses Input */}
					<div className="space-y-2">
						<Label htmlFor="maxUses">Max uses per code</Label>
						<Input
							id="maxUses"
							type="number"
							min={0}
							max={10_000}
							{...form.register('maxUses', { valueAsNumber: true })}
						/>
						<p className="text-xs text-gray-500">Set to 0 for unlimited uses</p>
					</div>

					{/* Expiration */}
					<div className="space-y-2">
						<Label>Expiration</Label>
						<div className="flex items-center gap-2">
							<input
								type="checkbox"
								id="noExpiration"
								{...form.register('noExpiration')}
								className="size-4 rounded border-gray-300"
							/>
							<Label htmlFor="noExpiration" className="cursor-pointer">
								No expiration
							</Label>
						</div>
						{!watchNoExpiration && (
							<>
								<DatePicker
									value={form.watch('expiresAt')}
									onValueChange={value => form.setValue('expiresAt', value)}
									placeholder="Select expiration date"
									minDate={new Date()}
								/>
								{form.formState.errors.expiresAt && (
									<p className="text-sm text-red-500">
										{form.formState.errors.expiresAt.message}
									</p>
								)}
							</>
						)}
					</div>

					<DialogFooter className="sm:justify-center">
						<Button
							type="submit"
							disabled={isSubmitting}
							className="font-clash-display hover:bg-background w-full max-w-xs cursor-pointer border-2 border-black bg-black font-semibold hover:text-black"
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

/**
 * Colored decorative cards SVG for modal background
 */
function ColoredCards(props: ComponentProps<'svg'>) {
	return (
		<svg
			width="393"
			height="234"
			viewBox="0 0 393 234"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M412.192 347.187C408.762 359.99 395.601 367.588 382.798 364.157L225.402 321.983C212.599 318.553 205.001 305.393 208.432 292.59L250.606 135.194C254.036 122.39 267.196 114.792 280 118.223L437.396 160.397C450.199 163.828 457.797 176.988 454.366 189.791L412.192 347.187Z"
				fill="#C4EDFF"
			/>
			<path
				d="M500.086 219.272C494.38 231.235 480.056 236.308 468.092 230.601L342.882 170.878C330.918 165.171 325.846 150.847 331.552 138.883L391.276 13.6734C396.982 1.70985 411.306 -3.36259 423.27 2.34386L548.48 62.0671C560.444 67.7736 565.516 82.098 559.81 94.0616L500.086 219.272Z"
				fill="#BEFFDB"
			/>
			<path
				d="M267.381 283.914C274.008 295.393 270.075 310.071 258.596 316.698L117.479 398.172C106 404.8 91.3217 400.867 84.6943 389.388L3.2201 248.27C-3.40731 236.791 0.52568 222.113 12.0047 215.486L153.122 134.012C164.601 127.384 179.279 131.317 185.907 142.796L267.381 283.914Z"
				fill="#F6FF8B"
			/>
		</svg>
	);
}
