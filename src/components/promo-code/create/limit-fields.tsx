'use client';

import type { UseFormReturn } from 'react-hook-form';

import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import type { CreatePromoCodeFormData } from './schema';

interface CreatePromoCodeLimitFieldsProps {
	form: UseFormReturn<CreatePromoCodeFormData>;
	watchUnlimitedUses: boolean;
	watchUnlimitedPerUser: boolean;
	watchNoExpiration: boolean;
	onUnlimitedUsesChange: (checked: boolean) => void;
	onUnlimitedPerUserChange: (checked: boolean) => void;
	onNoExpirationChange: (checked: boolean) => void;
}

/**
 * Usage-limit and expiration fields for the create-promo form — the
 * three checkboxes and their conditional numeric inputs + date picker.
 * Kept together because the three knobs share a visual rhythm (`label
 * → checkbox → conditional input → help text`) that would rot
 * independently if split further.
 */
export function CreatePromoCodeLimitFields({
	form,
	watchUnlimitedUses,
	watchUnlimitedPerUser,
	watchNoExpiration,
	onUnlimitedUsesChange,
	onUnlimitedPerUserChange,
	onNoExpirationChange,
}: CreatePromoCodeLimitFieldsProps) {
	const expiresAtError = form.formState.errors.expiresAt;
	return (
		<>
			<div className="flex flex-col gap-2">
				<Label>Max uses per code</Label>
				<div className="flex items-center gap-2">
					<input
						type="checkbox"
						id="unlimitedUses"
						checked={watchUnlimitedUses}
						onChange={event => onUnlimitedUsesChange(event.target.checked)}
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

			<div className="flex flex-col gap-2">
				<Label>Per-user redemption limit</Label>
				<div className="flex items-center gap-2">
					<input
						type="checkbox"
						id="unlimitedPerUser"
						checked={watchUnlimitedPerUser}
						onChange={event => onUnlimitedPerUserChange(event.target.checked)}
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

			<div className="flex flex-col gap-2">
				<Label>Expiration</Label>
				<div className="flex items-center gap-2">
					<input
						type="checkbox"
						id="noExpiration"
						checked={watchNoExpiration}
						onChange={event => onNoExpirationChange(event.target.checked)}
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
						{expiresAtError ? (
							<p className="text-sm text-red-500">{expiresAtError.message}</p>
						) : null}
					</>
				) : null}
			</div>
		</>
	);
}
