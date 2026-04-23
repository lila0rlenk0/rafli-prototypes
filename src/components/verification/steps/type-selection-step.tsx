'use client';

import { Building2, Trophy, User } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/class-names';
import {
	VERIFICATION_TYPE,
	type VerificationType,
} from '@/types/kyc-submission';

import { useVerificationForm } from '@/components/verification/form/form-provider';

const TYPE_OPTIONS = [
	{
		value: VERIFICATION_TYPE.KYB_INDIVIDUAL,
		title: 'Individual Host',
		description:
			'Verify your identity as an individual to start hosting sweepstakes on the platform.',
		icon: User,
	},
	{
		value: VERIFICATION_TYPE.KYB_COMPANY,
		title: 'Company Host',
		description:
			'Register your business to host sweepstakes as a company or organization.',
		icon: Building2,
	},
	{
		value: VERIFICATION_TYPE.KYC_WINNER,
		title: 'Sweepstakes Winner',
		description:
			'Verify your identity to claim a sweepstakes prize you have won.',
		icon: Trophy,
	},
] as const;

/**
 * TypeSelectionStep Component
 *
 * First step of the verification form. User selects which type of
 * verification they need (individual host, company host, or winner).
 *
 * @returns Selection cards for verification type
 */
export function TypeSelectionStep() {
	const { setVerificationType, nextStep } = useVerificationForm();
	const [selected, setSelected] = useState<VerificationType | null>(null);

	function handleSelect(value: VerificationType) {
		setSelected(value);
	}

	function handleContinue() {
		if (!selected) return;
		setVerificationType(selected);
		nextStep();
	}

	return (
		<div className="flex flex-col gap-6 pt-6">
			<p className="text-muted-foreground text-sm">
				Choose the type of verification that applies to you. Each type requires
				different information and documents.
			</p>

			<div className="flex flex-col gap-3">
				{TYPE_OPTIONS.map(option => (
					<button
						key={option.value}
						type="button"
						onClick={() => handleSelect(option.value)}
						className={cn(
							'flex items-start gap-4 rounded-xl border p-5 text-left transition-colors',
							selected === option.value
								? 'border-black bg-black/[0.02]'
								: 'border-border hover:border-black/30',
						)}
					>
						<div
							className={cn(
								'flex size-10 shrink-0 items-center justify-center rounded-lg',
								selected === option.value
									? 'bg-black text-white'
									: 'bg-muted text-muted-foreground',
							)}
						>
							<option.icon className="size-5" />
						</div>
						<div className="flex flex-col gap-1">
							<span className="text-sm font-semibold">{option.title}</span>
							<span className="text-muted-foreground text-sm">
								{option.description}
							</span>
						</div>
					</button>
				))}
			</div>

			<Button
				type="button"
				onClick={handleContinue}
				disabled={!selected}
				className="mt-2 w-full"
			>
				Continue
			</Button>
		</div>
	);
}
