'use client';

import type { ChangeEvent, KeyboardEvent } from 'react';

import { PromoCodeEntryField } from '@/components/promo-code/entry-field';
import { PromoCodeValidatedView } from '@/components/promo-code/validated-view';
import { usePromoCodeValidation } from '@/components/promo-code/use-validation';
import type { ValidatedPromoCode } from '@/types/promo-code';

interface PromoCodeInputProps {
	raffleId: string;
	onValidCode: (promo: ValidatedPromoCode) => void;
	onClear: () => void;
	disabled?: boolean;
	/** Initial code from URL to auto-validate. */
	initialCode?: string;
}

/**
 * PromoCodeInput — collapsed trigger, expanded input, and validated
 * chip. Owns the three visual states and delegates the validation
 * lifecycle (state + async calls + auto-validate) to
 * `usePromoCodeValidation`. Expanded/validated subtrees live in
 * sibling components so each keeps a clean prop contract.
 */
export function PromoCodeInput({
	raffleId,
	onValidCode,
	onClear,
	disabled = false,
	initialCode,
}: PromoCodeInputProps) {
	const {
		code,
		setCode,
		isValidating,
		validatedPromo,
		error,
		setError,
		isExpanded,
		setIsExpanded,
		validate,
		removeCode,
		resetCode,
	} = usePromoCodeValidation({ raffleId, initialCode, onValidCode });

	function handleRemove() {
		removeCode();
		onClear();
	}

	function handleCodeChange(event: ChangeEvent<HTMLInputElement>) {
		setCode(event.target.value.toUpperCase());
		setError(null);
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' && code.trim() && !isValidating) {
			event.preventDefault();
			validate();
		}
	}

	if (disabled) return null;

	if (validatedPromo) {
		return (
			<PromoCodeValidatedView
				validatedPromo={validatedPromo}
				onRemove={handleRemove}
			/>
		);
	}

	if (!isExpanded) {
		return (
			<button
				type="button"
				onClick={() => setIsExpanded(true)}
				className="text-ink-500 text-sm transition-colors hover:text-gray-900"
			>
				Have a promo code?
			</button>
		);
	}

	return (
		<PromoCodeEntryField
			code={code}
			error={error}
			isValidating={isValidating}
			onCodeChange={handleCodeChange}
			onKeyDown={handleKeyDown}
			onApply={() => validate()}
			onCancel={resetCode}
		/>
	);
}
