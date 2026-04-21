'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Copy, Download, Loader2 } from 'lucide-react';
import { ComponentProps, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useTimeout } from '@/lib/hooks/use-timeout';

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
 * Form schema for creating promo codes.
 * Exported for unit testing — not intended for external consumption.
 */
export const createPromoCodeFormSchema = z
	.object({
		count: z.number().int().min(1).max(100),
		type: z.enum([
			PROMO_CODE_TYPE.FREE_TICKETS,
			PROMO_CODE_TYPE.DISCOUNT_FIXED,
			PROMO_CODE_TYPE.DISCOUNT_PERCENT,
		]),
		value: z.number().positive('Value must be positive'),
		unlimitedUses: z.boolean(),
		maxUses: z.number().int().min(0).max(10_000),
		unlimitedPerUser: z.boolean(),
		maxRedemptionsPerUser: z.number().int().min(0).max(10_000),
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
	)
	// Prevent 0 (API's "unlimited" convention) when user didn't check unlimited
	.refine(data => data.unlimitedUses || data.maxUses >= 1, {
		message: 'Max uses must be at least 1',
		path: ['maxUses'],
	})
	.refine(data => data.unlimitedPerUser || data.maxRedemptionsPerUser >= 1, {
		message: 'Max redemptions per user must be at least 1',
		path: ['maxRedemptionsPerUser'],
	});

type CreatePromoCodeFormData = z.infer<typeof createPromoCodeFormSchema>;

/**
 * Data for creating promo codes
 */
export interface CreatePromoCodeData {
	count: number;
	type: PromoCodeType;
	value: number;
	maxUses: number;
	maxRedemptionsPerUser: number;
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
	const setCopyTimeout = useTimeout();
	const setCopyAllTimeout = useTimeout();

	const form = useForm<CreatePromoCodeFormData>({
		resolver: zodResolver(createPromoCodeFormSchema),
		defaultValues: {
			count: 1,
			type: allowFreeTickets
				? PROMO_CODE_TYPE.FREE_TICKETS
				: PROMO_CODE_TYPE.DISCOUNT_FIXED,
			value: 1,
			unlimitedUses: false,
			maxUses: 1,
			unlimitedPerUser: true,
			maxRedemptionsPerUser: 0,
			noExpiration: true,
			expiresAt: undefined,
		},
	});

	const watchType = form.watch('type');
	const watchNoExpiration = form.watch('noExpiration');
	const watchUnlimitedUses = form.watch('unlimitedUses');
	const watchUnlimitedPerUser = form.watch('unlimitedPerUser');

	// Adjust-state-during-render pattern (replaces a useEffect sync).
	//
	// Why: the Free Tickets radio is already `disabled` when the host disallows
	// them, so the user can never pick this type via the UI. The only path into
	// a stale `type === FREE_TICKETS` state is the `allowFreeTickets` prop
	// flipping from true to false while the modal is open (e.g. the host edits
	// their raffle in another tab and the parent re-renders with the new prop).
	//
	// React's recommended fix for "reset some state when a prop changes" is to
	// compare the prop to a previous value stored in state and call the setter
	// during render — React discards the first render and re-runs with the new
	// value, which is cheaper and more correct than a post-render useEffect.
	// See: https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
	const [prevAllowFreeTickets, setPrevAllowFreeTickets] =
		useState(allowFreeTickets);
	if (prevAllowFreeTickets !== allowFreeTickets) {
		// Track the new prop value for the next render's comparison.
		setPrevAllowFreeTickets(allowFreeTickets);
		// If the host just revoked free-ticket support and the form is currently
		// sitting on that type, snap it back to a still-valid option. Guarded so
		// unrelated prop flips don't clobber the user's selection.
		if (!allowFreeTickets && watchType === PROMO_CODE_TYPE.FREE_TICKETS) {
			form.setValue('type', PROMO_CODE_TYPE.DISCOUNT_FIXED);
		}
	}

	function handleTypeChange(type: PromoCodeType) {
		form.setValue('type', type);

		// Free tickets must stay integer-backed so the form never renders a
		// decimal quantity that the schema will reject on submit.
		if (type === PROMO_CODE_TYPE.FREE_TICKETS) {
			form.setValue('value', Math.max(1, Math.floor(form.getValues('value'))));
		}
	}

	function handleUnlimitedUsesChange(checked: boolean) {
		form.setValue('unlimitedUses', checked);
		form.setValue(
			'maxUses',
			checked ? 0 : Math.max(1, form.getValues('maxUses')),
		);
	}

	function handleUnlimitedPerUserChange(checked: boolean) {
		form.setValue('unlimitedPerUser', checked);
		form.setValue(
			'maxRedemptionsPerUser',
			checked ? 0 : Math.max(1, form.getValues('maxRedemptionsPerUser')),
		);
	}

	function handleNoExpirationChange(checked: boolean) {
		form.setValue('noExpiration', checked);
		if (checked) {
			form.setValue('expiresAt', undefined);
		}
	}

	/**
	 * Returns label for value input based on type
	 */
	function getValueLabel(): string {
		switch (watchType) {
			case PROMO_CODE_TYPE.FREE_TICKETS:
				return 'Number of bonus entries';
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
		setCopyTimeout(() => setCopiedIndex(null), 2_000);
	}

	/**
	 * Copies all codes to clipboard
	 */
	async function handleCopyAll() {
		if (!createdCodes) return;
		await navigator.clipboard.writeText(createdCodes.codes.join('\n'));
		setCopiedAll(true);
		setCopyAllTimeout(() => setCopiedAll(false), 2_000);
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
								{remainingCount > 0 ? (
									<p className="text-xs text-gray-500">
										+{remainingCount} more code{remainingCount !== 1 ? 's' : ''}{' '}
										(use Copy All or Export)
									</p>
								) : null}
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
									{createdCodes.bulkId ? (
										onExportBatch ? (
											<Button
												variant="outline"
												size="sm"
												onClick={() => onExportBatch(createdCodes.bulkId!)}
												className="flex-1"
											>
												<Download className="size-4" />
												Export Batch
											</Button>
										) : null
									) : null}
								</div>
							</>
						)}
					</div>

					<div className="flex justify-center">
						<Button
							onClick={handleClose}
							className="font-clash-display hover:bg-background w-full max-w-xs cursor-pointer border-2 border-black bg-black font-semibold hover:text-black"
						>
							Done
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		);
	}

	// Form state
	return (
		<Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
			<DialogContent className="max-w-md overflow-hidden border border-[#0F0F0FF2] p-14">
				<ColoredCards className="absolute right-0 bottom-0 -z-1 rounded-br-xl" />

				<DialogHeader>
					<DialogTitle className="font-clash-display text-3xl font-semibold text-[#182135]">
						Create Promo Codes
					</DialogTitle>
					<DialogDescription>
						Create promotional codes for discounts or bonus entries.
					</DialogDescription>
				</DialogHeader>

				<form
					onSubmit={e => {
						e.stopPropagation();
						form.handleSubmit(onSubmit)(e);
					}}
					className="space-y-4"
				>
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
						{form.formState.errors.count ? (
							<p className="text-sm text-red-500">
								{form.formState.errors.count.message}
							</p>
						) : null}
						<p className="text-xs text-gray-500">
							Generate 1-100 codes at once
						</p>
					</div>

					{/* Type Selection */}
					<div className="space-y-2">
						<Label>Type</Label>
						<RadioGroup
							value={watchType}
							onValueChange={value => handleTypeChange(value as PromoCodeType)}
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
						{!allowFreeTickets ? (
							<p className="text-xs text-gray-500">
								Bonus entries require a raffle question.
							</p>
						) : null}
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
						{form.formState.errors.value ? (
							<p className="text-sm text-red-500">
								{form.formState.errors.value.message}
							</p>
						) : null}
					</div>

					{/* Max Uses Per Code */}
					<div className="space-y-2">
						<Label>Max uses per code</Label>
						<div className="flex items-center gap-2">
							<input
								type="checkbox"
								id="unlimitedUses"
								checked={watchUnlimitedUses}
								onChange={event =>
									handleUnlimitedUsesChange(event.target.checked)
								}
								className="size-4 rounded border-gray-300"
							/>
							<Label htmlFor="unlimitedUses" className="cursor-pointer">
								Unlimited uses
							</Label>
						</div>
						{!watchUnlimitedUses ? (
							<Input
								id="maxUses"
								type="number"
								min={1}
								max={10_000}
								{...form.register('maxUses', { valueAsNumber: true })}
							/>
						) : null}
						<p className="text-xs text-gray-500">
							How many times each code can be redeemed in total
						</p>
					</div>

					{/* Max Redemptions Per User */}
					<div className="space-y-2">
						<Label>Per-user redemption limit</Label>
						<div className="flex items-center gap-2">
							<input
								type="checkbox"
								id="unlimitedPerUser"
								checked={watchUnlimitedPerUser}
								onChange={event =>
									handleUnlimitedPerUserChange(event.target.checked)
								}
								className="size-4 rounded border-gray-300"
							/>
							<Label htmlFor="unlimitedPerUser" className="cursor-pointer">
								Unlimited per user
							</Label>
						</div>
						{!watchUnlimitedPerUser ? (
							<Input
								id="maxRedemptionsPerUser"
								type="number"
								min={1}
								max={10_000}
								{...form.register('maxRedemptionsPerUser', {
									valueAsNumber: true,
								})}
							/>
						) : null}
						<p className="text-xs text-gray-500">
							How many codes from this batch a single user can redeem
						</p>
					</div>

					{/* Expiration */}
					<div className="space-y-2">
						<Label>Expiration</Label>
						<div className="flex items-center gap-2">
							<input
								type="checkbox"
								id="noExpiration"
								checked={watchNoExpiration}
								onChange={event =>
									handleNoExpirationChange(event.target.checked)
								}
								className="size-4 rounded border-gray-300"
							/>
							<Label htmlFor="noExpiration" className="cursor-pointer">
								No expiration
							</Label>
						</div>
						{!watchNoExpiration ? (
							<>
								<DatePicker
									value={form.watch('expiresAt')}
									onValueChange={value => form.setValue('expiresAt', value)}
									placeholder="Select expiration date"
									minDate={new Date()}
								/>
								{form.formState.errors.expiresAt ? (
									<p className="text-sm text-red-500">
										{form.formState.errors.expiresAt.message}
									</p>
								) : null}
							</>
						) : null}
					</div>

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
