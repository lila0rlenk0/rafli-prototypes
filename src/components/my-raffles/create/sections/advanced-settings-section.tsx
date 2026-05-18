'use client';

import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import type { EnrollmentMode, WinnerSelectionMode } from '@/types/raffle';

interface AdvancedSettingsSectionProps {
	minTickets: number;
	maxTicketsPerUser: number;
	winnerSelectionMode: WinnerSelectionMode;
	enrollmentMode: EnrollmentMode;
	xShareTicketsEnabled: boolean;
	// Field-level writers keep this section structurally compatible with
	// both the create and edit wizards — mirrors the CryptoConfigSection
	// pattern (see code comment there). Casting at the boundary keeps
	// `react-hook-form`'s invariant `UseFormReturn` out of this leaf.
	onMinTicketsChange: (value: number) => void;
	onMaxTicketsPerUserChange: (value: number) => void;
	onWinnerSelectionModeChange: (value: WinnerSelectionMode) => void;
	onEnrollmentModeChange: (value: EnrollmentMode) => void;
	onXShareTicketsEnabledChange: (value: boolean) => void;
}

/**
 * Advanced raffle configuration card.
 *
 * Surfaces five backend-supported controls that were previously absent
 * from the wizard:
 *  - `minTickets` — sales floor; 0 disables the gate
 *  - `maxTicketsPerUser` — per-user cap; 0 = unlimited (backend caps at 1000)
 *  - `winnerSelectionMode` — `unique_user` vs `per_ticket` (immutable past draft)
 *  - `enrollmentMode` — `standard` vs `wallet` (immutable past draft)
 *  - `xShareTicketsEnabled` — opt-in to the X share free-entry promo
 *
 * Defaults mirror the backend so an untouched section submits an
 * identical wire payload to "field omitted".
 *
 * @returns Advanced settings card JSX.
 */
export function AdvancedSettingsSection({
	minTickets,
	maxTicketsPerUser,
	winnerSelectionMode,
	enrollmentMode,
	xShareTicketsEnabled,
	onMinTicketsChange,
	onMaxTicketsPerUserChange,
	onWinnerSelectionModeChange,
	onEnrollmentModeChange,
	onXShareTicketsEnabledChange,
}: AdvancedSettingsSectionProps) {
	return (
		<div className="flex flex-col gap-6 rounded-2xl bg-white p-8">
			<div>
				<h2 className="text-xl font-semibold">Advanced settings</h2>
				<p className="text-muted-foreground text-sm">
					Optional limits and modes. Defaults match the backend.
				</p>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<NumberField
					id="minTickets"
					label="Minimum tickets"
					description="Sales floor. 0 disables the gate."
					value={minTickets}
					onChange={onMinTicketsChange}
				/>
				<NumberField
					id="maxTicketsPerUser"
					label="Max tickets per user"
					description="0 = unlimited. Backend caps at 1000."
					value={maxTicketsPerUser}
					onChange={onMaxTicketsPerUserChange}
					max={1_000}
				/>
			</div>

			<WinnerSelectionField
				value={winnerSelectionMode}
				onChange={onWinnerSelectionModeChange}
			/>

			<EnrollmentModeField
				value={enrollmentMode}
				onChange={onEnrollmentModeChange}
			/>

			<XShareField
				value={xShareTicketsEnabled}
				onChange={onXShareTicketsEnabledChange}
			/>
		</div>
	);
}

interface NumberFieldProps {
	id: string;
	label: string;
	description: string;
	value: number;
	onChange: (value: number) => void;
	max?: number;
}

function NumberField({
	id,
	label,
	description,
	value,
	onChange,
	max,
}: NumberFieldProps) {
	function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
		const parsed = Number(event.target.value);
		// Empty string and NaN both collapse to 0 — matches backend
		// semantics where 0 means "disabled" / "unlimited" for both numeric
		// controls in this section.
		onChange(Number.isFinite(parsed) ? parsed : 0);
	}
	return (
		<div className="flex flex-col gap-2">
			<label htmlFor={id} className="font-medium">
				{label}
			</label>
			<Input
				id={id}
				type="number"
				min={0}
				max={max}
				value={Number.isFinite(value) ? value : 0}
				onChange={handleChange}
				className="border-ink-200"
			/>
			<span className="text-muted-foreground text-xs">{description}</span>
		</div>
	);
}

interface WinnerSelectionFieldProps {
	value: WinnerSelectionMode;
	onChange: (value: WinnerSelectionMode) => void;
}

function WinnerSelectionField({ value, onChange }: WinnerSelectionFieldProps) {
	return (
		<div className="flex flex-col gap-2">
			<span className="font-medium">Winner selection</span>
			<RadioGroup
				value={value}
				onValueChange={v => onChange(v as WinnerSelectionMode)}
				className="grid gap-2"
			>
				<RadioOption
					id="winner-unique-user"
					value="unique_user"
					title="Unique user"
					description="A user wins at most once, regardless of how many tickets they hold."
					checked={value === 'unique_user'}
				/>
				<RadioOption
					id="winner-per-ticket"
					value="per_ticket"
					title="Per ticket"
					description="Each ticket is an independent chance — a user with N tickets can win N times."
					checked={value === 'per_ticket'}
				/>
			</RadioGroup>
			<span className="text-muted-foreground text-xs">
				Locked after the raffle leaves draft.
			</span>
		</div>
	);
}

interface EnrollmentModeFieldProps {
	value: EnrollmentMode;
	onChange: (value: EnrollmentMode) => void;
}

function EnrollmentModeField({ value, onChange }: EnrollmentModeFieldProps) {
	return (
		<div className="flex flex-col gap-2">
			<span className="font-medium">Enrollment mode</span>
			<RadioGroup
				value={value}
				onValueChange={v => onChange(v as EnrollmentMode)}
				className="grid gap-2"
			>
				<RadioOption
					id="enrollment-standard"
					value="standard"
					title="Standard checkout"
					description="Users buy entries through the regular checkout."
					checked={value === 'standard'}
				/>
				<RadioOption
					id="enrollment-wallet"
					value="wallet"
					title="Wallet enrollment"
					description="Entries arrive via programmatic wallet enrollment (partner / ACP integrations)."
					checked={value === 'wallet'}
				/>
			</RadioGroup>
			<span className="text-muted-foreground text-xs">
				Locked after the raffle leaves draft.
			</span>
		</div>
	);
}

interface RadioOptionProps {
	id: string;
	value: string;
	title: string;
	description: string;
	checked: boolean;
}

function RadioOption({
	id,
	value,
	title,
	description,
	checked,
}: RadioOptionProps) {
	// State updates flow through `RadioGroup.onValueChange` on the
	// parent — the label only forwards the click to its associated
	// `RadioGroupItem` via `htmlFor`. Wiring `onClick` here too would
	// double-fire on mouse clicks.
	return (
		<label
			htmlFor={id}
			className={
				checked
					? 'border-primary flex cursor-pointer items-start gap-3 rounded-lg border p-3'
					: 'border-input hover:border-ring flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors'
			}
		>
			<RadioGroupItem id={id} value={value} className="mt-1" />
			<div className="flex flex-col">
				<span className="font-medium">{title}</span>
				<span className="text-muted-foreground text-xs">{description}</span>
			</div>
		</label>
	);
}

interface XShareFieldProps {
	value: boolean;
	onChange: (value: boolean) => void;
}

function XShareField({ value, onChange }: XShareFieldProps) {
	return (
		<div className="flex items-start justify-between gap-4 rounded-lg border p-4">
			<div className="flex flex-col">
				<span className="font-medium">X share free entries</span>
				<span className="text-muted-foreground text-xs">
					Let users claim one free entry by verifying a share of this raffle on
					X.
				</span>
			</div>
			<Switch checked={value} onCheckedChange={onChange} />
		</div>
	);
}
