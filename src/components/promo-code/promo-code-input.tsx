'use client';

import { Check, Loader2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { validatePromoCode } from '@/services/promo-code/validate-promo-code';
import {
	getPromoCodeDescription,
	type ValidatedPromoCode,
} from '@/types/promo-code';

/**
 * Props for PromoCodeInput
 */
interface PromoCodeInputProps {
	raffleId: string;
	onValidCode: (promo: ValidatedPromoCode) => void;
	onClear: () => void;
	disabled?: boolean;
	/** Initial code from URL to auto-validate */
	initialCode?: string;
}

/**
 * PromoCodeInput Component
 *
 * Allows participants to enter and validate promo codes.
 * Starts collapsed with "Have a promo code?" text.
 * Expands to show input when clicked.
 * If initialCode provided, auto-expands and validates on mount.
 */
export function PromoCodeInput({
	raffleId,
	onValidCode,
	onClear,
	disabled = false,
	initialCode,
}: PromoCodeInputProps) {
	const [isExpanded, setIsExpanded] = useState(!!initialCode);
	const [code, setCode] = useState(initialCode?.trim().toUpperCase() || '');
	const [isValidating, setIsValidating] = useState(false);
	const [validatedPromo, setValidatedPromo] =
		useState<ValidatedPromoCode | null>(null);
	const [error, setError] = useState<string | null>(null);
	const hasAutoValidated = useRef(false);

	// Ref-stabilize onValidCode so the auto-validation effect doesn't depend on
	// the parent's inline callback reference. Without this, parent re-renders
	// (e.g. from useRaffleSaleWindow timer) cancel the in-flight validation via
	// the effect cleanup, but hasAutoValidated prevents a retry — validation is lost.
	const onValidCodeRef = useRef(onValidCode);
	useEffect(() => {
		onValidCodeRef.current = onValidCode;
	}, [onValidCode]);

	/**
	 * Gets user-friendly error message for validation errors
	 * Maps backend `core:promo:*` error codes to user-friendly messages
	 * @param errorCode - The error code from validation
	 * @returns Human-readable error message
	 */
	function getErrorMessage(errorCode: string): string {
		switch (errorCode) {
			case 'core:promo:not-found':
				return 'Invalid promo code';
			case 'core:promo:expired':
				return 'This code has expired';
			case 'core:promo:max-uses-reached':
				return 'This code has reached its usage limit';
			case 'core:promo:deactivated':
				return 'This code is no longer active';
			case 'core:promo:already-redeemed':
				return 'You have already used this code';
			case 'core:promo:host-cannot-redeem':
				return 'You cannot use codes on your own raffle';
			case 'core:promo:question-required':
				return 'Please answer the question first';
			case 'core:promo:raffle-mismatch':
				return 'This code is for a different raffle';
			case 'core:raffle:not-found':
				return 'Raffle not found';
			case 'core:raffle:not-live':
				return 'This raffle is not currently active';
			case 'invalid_code':
				return 'Invalid promo code format';
			case 'global:auth:unauthenticated':
			case 'unauthorized':
				return 'Sign in to apply promo codes';
			case 'network_error':
				return 'Network error. Please check your connection.';
			case 'timeout_error':
				return 'Request timed out. Please try again.';
			default:
				return 'Could not validate code';
		}
	}

	/**
	 * Handles code validation
	 * Transforms backend response to ValidatedPromoCode format
	 * @param codeToValidate - Optional code override, defaults to current state
	 */
	async function handleValidate(codeToValidate?: string) {
		const targetCode = (codeToValidate ?? code).trim().toUpperCase();
		if (!targetCode) return;

		// Step 1: Enter validating state.
		setIsValidating(true);
		setError(null);

		// Step 2: Call validation service.
		const result = await validatePromoCode(raffleId, targetCode);

		setIsValidating(false);

		if (!result.success) {
			// Step 3: Show error if invalid.
			setError(getErrorMessage(result.error));
			return;
		}

		const response = result.data;

		// Transform backend response to ValidatedPromoCode
		// Backend returns { valid, type, discountAmount?, ticketsGranted? }
		// Frontend expects { valid, code, type, value }
		const value =
			response.ticketsGranted !== undefined
				? response.ticketsGranted.toString()
				: (response.discountAmount ?? '0');

		// Step 4: Normalize and store validated promo.
		const promo: ValidatedPromoCode = {
			valid: true,
			code: targetCode,
			type: response.type,
			value,
		};

		setCode(targetCode);
		setValidatedPromo(promo);
		onValidCode(promo);
	}

	/**
	 * Auto-validate initialCode on mount.
	 * Uses onValidCodeRef (not onValidCode directly) so parent re-renders
	 * don't trigger effect cleanup that would cancel the in-flight request.
	 */
	useEffect(() => {
		const normalized = initialCode?.trim().toUpperCase() ?? '';
		if (!normalized || hasAutoValidated.current || validatedPromo) return;
		hasAutoValidated.current = true;

		let cancelled = false;

		async function autoValidate() {
			// Step 2: Validate initial code on mount.
			setIsValidating(true);
			setError(null);

			const result = await validatePromoCode(raffleId, normalized);
			if (cancelled) return;

			setIsValidating(false);

			if (!result.success) {
				setError(getErrorMessage(result.error));
				return;
			}

			const value =
				result.data.ticketsGranted !== undefined
					? result.data.ticketsGranted.toString()
					: (result.data.discountAmount ?? '0');

			// Step 3: Apply validated promo to state.
			const promo: ValidatedPromoCode = {
				valid: true,
				code: normalized,
				type: result.data.type,
				value,
			};

			setValidatedPromo(promo);
			onValidCodeRef.current(promo);
		}

		autoValidate();
		return () => {
			cancelled = true;
		};
		// onValidCode excluded — accessed via stable ref to prevent parent re-renders
		// (e.g. countdown timer) from cancelling the in-flight validation request.
	}, [initialCode, raffleId, validatedPromo]);

	/**
	 * Handles removing the validated code
	 */
	function handleRemove() {
		setCode('');
		setValidatedPromo(null);
		setError(null);
		setIsExpanded(false);
		onClear();
	}

	/**
	 * Resets the input to collapsed state
	 */
	function handleReset() {
		setCode('');
		setError(null);
		setIsExpanded(false);
	}

	/**
	 * Handles Enter key press
	 */
	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === 'Enter' && code.trim() && !isValidating) {
			e.preventDefault();
			handleValidate();
		}
	}

	// Don't show anything if disabled (host viewing own raffle)
	if (disabled) {
		return null;
	}

	// Show validated state
	if (validatedPromo) {
		return (
			<div className="rounded-lg border border-green-200 bg-green-50 p-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Check className="size-4 text-green-600" />
						<span className="font-mono text-sm font-medium text-green-800">
							{validatedPromo.code}
						</span>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={handleRemove}
						className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
					>
						Remove
					</Button>
				</div>
				<p className="mt-1 text-sm text-green-700">
					{getPromoCodeDescription(validatedPromo)}
				</p>
			</div>
		);
	}

	// Collapsed state - show trigger text
	if (!isExpanded) {
		return (
			<button
				type="button"
				onClick={() => setIsExpanded(true)}
				className="text-sm text-[#7B7B7B] transition-colors hover:text-gray-900"
			>
				Have a promo code?
			</button>
		);
	}

	// Expanded state - show input
	return (
		<div className="space-y-2">
			<div className="flex gap-2">
				<Input
					value={code}
					onChange={e => {
						setCode(e.target.value.toUpperCase());
						setError(null);
					}}
					onKeyDown={handleKeyDown}
					placeholder="Enter code"
					disabled={isValidating}
					autoFocus
					maxLength={20}
					className={cn(
						'font-mono uppercase',
						error &&
							'border-red-300 focus-visible:border-red-400 focus-visible:ring-red-100',
					)}
				/>
				<Button
					variant="outline"
					onClick={() => handleValidate()}
					disabled={!code.trim() || isValidating}
					className="shrink-0"
				>
					{isValidating ? <Loader2 className="size-4 animate-spin" /> : 'Apply'}
				</Button>
			</div>

			{error && (
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-1.5 text-sm text-red-600">
						<X className="size-3.5" />
						<span>{error}</span>
					</div>
					<button
						type="button"
						onClick={handleReset}
						className="text-xs text-gray-500 transition-colors hover:text-gray-700"
					>
						Cancel
					</button>
				</div>
			)}
		</div>
	);
}
