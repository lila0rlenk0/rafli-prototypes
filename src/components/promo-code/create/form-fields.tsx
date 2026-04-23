'use client';

import type { UseFormReturn } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/class-names';
import { PROMO_CODE_TYPE, type PromoCodeType } from '@/types/promo-code';

import { CreatePromoCodeLimitFields } from './limit-fields';
import type { CreatePromoCodeFormData } from './schema';

interface CreatePromoCodeFormFieldsProps {
	form: UseFormReturn<CreatePromoCodeFormData>;
	allowFreeTickets: boolean;
	watchType: PromoCodeType;
	watchUnlimitedUses: boolean;
	watchUnlimitedPerUser: boolean;
	watchNoExpiration: boolean;
	onTypeChange: (type: PromoCodeType) => void;
	onUnlimitedUsesChange: (checked: boolean) => void;
	onUnlimitedPerUserChange: (checked: boolean) => void;
	onNoExpirationChange: (checked: boolean) => void;
}

/**
 * Picks the value-field label based on the selected promo type. Keeps
 * the render body linear so it reads top-to-bottom.
 */
function getValueLabel(type: PromoCodeType): string {
	switch (type) {
		case PROMO_CODE_TYPE.FREE_TICKETS:
			return 'Number of bonus entries';
		case PROMO_CODE_TYPE.DISCOUNT_FIXED:
			return 'Discount amount ($)';
		case PROMO_CODE_TYPE.DISCOUNT_PERCENT:
			return 'Discount percentage (%)';
	}
}

/**
 * Picks the value-field step size — 0.01 for fixed dollar amounts,
 * 1 for ticket counts and percentages.
 */
function getValueStep(type: PromoCodeType): string {
	switch (type) {
		case PROMO_CODE_TYPE.DISCOUNT_FIXED:
			return '0.01';
		case PROMO_CODE_TYPE.FREE_TICKETS:
		case PROMO_CODE_TYPE.DISCOUNT_PERCENT:
			return '1';
	}
}

/**
 * Body of the create-promo form — count input, type radio group, value
 * input, and the usage-limit sub-block. Parent owns the RHF instance
 * and all state transitions; this component is purely presentational.
 */
export function CreatePromoCodeFormFields({
	form,
	allowFreeTickets,
	watchType,
	watchUnlimitedUses,
	watchUnlimitedPerUser,
	watchNoExpiration,
	onTypeChange,
	onUnlimitedUsesChange,
	onUnlimitedPerUserChange,
	onNoExpirationChange,
}: CreatePromoCodeFormFieldsProps) {
	const countError = form.formState.errors.count;
	const valueError = form.formState.errors.value;
	return (
		<>
			<div className="flex flex-col gap-2">
				<Label htmlFor="count">Number of codes</Label>
				<Input
					id="count"
					type="number"
					min={1}
					max={100}
					{...form.register('count', { valueAsNumber: true })}
				/>
				{countError ? (
					<p className="text-sm text-red-500">{countError.message}</p>
				) : null}
				<p className="text-xs text-gray-500">Generate 1-100 codes at once</p>
			</div>

			<div className="flex flex-col gap-2">
				<Label>Type</Label>
				<RadioGroup
					value={watchType}
					onValueChange={value => onTypeChange(value as PromoCodeType)}
					className="flex gap-4"
				>
					<div className="flex items-center gap-2">
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
							Bonus Entries
						</Label>
					</div>
					<div className="flex items-center gap-2">
						<RadioGroupItem
							value={PROMO_CODE_TYPE.DISCOUNT_FIXED}
							id="discount_fixed"
						/>
						<Label htmlFor="discount_fixed" className="cursor-pointer">
							Fixed ($)
						</Label>
					</div>
					<div className="flex items-center gap-2">
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
						Bonus entries require a sweepstakes question.
					</p>
				) : null}
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor="value">{getValueLabel(watchType)}</Label>
				<Input
					id="value"
					type="number"
					step={getValueStep(watchType)}
					min={1}
					max={watchType === PROMO_CODE_TYPE.DISCOUNT_PERCENT ? 100 : 10_000}
					{...form.register('value', { valueAsNumber: true })}
				/>
				{valueError ? (
					<p className="text-sm text-red-500">{valueError.message}</p>
				) : null}
			</div>

			<CreatePromoCodeLimitFields
				form={form}
				watchUnlimitedUses={watchUnlimitedUses}
				watchUnlimitedPerUser={watchUnlimitedPerUser}
				watchNoExpiration={watchNoExpiration}
				onUnlimitedUsesChange={onUnlimitedUsesChange}
				onUnlimitedPerUserChange={onUnlimitedPerUserChange}
				onNoExpirationChange={onNoExpirationChange}
			/>
		</>
	);
}
