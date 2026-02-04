'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Copy, Loader2 } from 'lucide-react';
import { useState } from 'react';
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
	);

type CreatePromoCodeFormData = z.infer<typeof createPromoCodeFormSchema>;

/**
 * Props for CreatePromoCodeModal
 */
interface CreatePromoCodeModalProps {
	isOpen: boolean;
	onClose: () => void;
	onCreate: (data: {
		count: number;
		type: PromoCodeType;
		value: number;
		maxUses: number;
		expiresAt?: string;
	}) => Promise<BulkCreatePromoCodesResponse | null>;
}

/**
 * Modal for creating promo codes (supports single and bulk creation)
 */
export function CreatePromoCodeModal({
	isOpen,
	onClose,
	onCreate,
}: CreatePromoCodeModalProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [createdCodes, setCreatedCodes] = useState<string[] | null>(null);
	const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
	const [copiedAll, setCopiedAll] = useState(false);

	const form = useForm<CreatePromoCodeFormData>({
		resolver: zodResolver(createPromoCodeFormSchema),
		defaultValues: {
			count: 1,
			type: PROMO_CODE_TYPE.FREE_TICKETS,
			value: 1,
			maxUses: 1,
			noExpiration: true,
			expiresAt: undefined,
		},
	});

	const watchType = form.watch('type');
	const watchNoExpiration = form.watch('noExpiration');

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
			const result = await onCreate({
				count: data.count,
				type: data.type,
				value: data.value,
				maxUses: data.maxUses,
				expiresAt:
					data.noExpiration || !data.expiresAt
						? undefined
						: new Date(data.expiresAt).toISOString(),
			});

			if (result) {
				setCreatedCodes(result.codes);
			}
		} finally {
			setIsSubmitting(false);
		}
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
		await navigator.clipboard.writeText(createdCodes.join('\n'));
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
		const isSingle = createdCodes.length === 1;
		const maxDisplayCodes = 10;
		const displayedCodes = createdCodes.slice(0, maxDisplayCodes);
		const remainingCount = createdCodes.length - maxDisplayCodes;

		return (
			<Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
				<DialogContent className="max-w-sm text-center">
					<DialogHeader className="items-center">
						<div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-green-100">
							<Check className="size-6 text-green-600" />
						</div>
						<DialogTitle>
							{isSingle ? 'Promo Code Created!' : `${createdCodes.length} Codes Created!`}
						</DialogTitle>
					</DialogHeader>

					<div className="my-4 space-y-2">
						{isSingle ? (
							<button
								type="button"
								onClick={() => handleCopyCode(createdCodes[0], 0)}
								className={cn(
									'mx-auto flex items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-3',
									'hover:border-gray-400 hover:bg-gray-50 transition-colors',
								)}
							>
								<span className="font-mono text-lg font-bold">
									{createdCodes[0]}
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
												'hover:bg-gray-100 transition-colors',
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
										+{remainingCount} more code{remainingCount !== 1 ? 's' : ''} (use Copy All)
									</p>
								)}
								<Button
									variant="outline"
									size="sm"
									onClick={handleCopyAll}
									className="w-full"
								>
									{copiedAll ? (
										<>
											<Check className="size-4" />
											Copied all {createdCodes.length}!
										</>
									) : (
										<>
											<Copy className="size-4" />
											Copy All {createdCodes.length} Codes
										</>
									)}
								</Button>
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
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Create Promo Codes</DialogTitle>
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
						<p className="text-xs text-gray-500">Generate 1-100 codes at once</p>
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
								/>
								<Label htmlFor="free_tickets" className="cursor-pointer">
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
					</div>

					{/* Value Input */}
					<div className="space-y-2">
						<Label htmlFor="value">{getValueLabel()}</Label>
						<Input
							id="value"
							type="number"
							step={getValueStep()}
							min={1}
							max={watchType === PROMO_CODE_TYPE.DISCOUNT_PERCENT ? 100 : 10_000}
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
							<DatePicker
								value={form.watch('expiresAt')}
								onValueChange={value => form.setValue('expiresAt', value)}
								placeholder="Select expiration date"
								minDate={new Date()}
							/>
						)}
					</div>

					<DialogFooter className="gap-2 sm:gap-0">
						<Button
							type="button"
							variant="outline"
							onClick={handleClose}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting}>
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
