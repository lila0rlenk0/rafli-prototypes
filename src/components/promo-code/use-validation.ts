'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { getPromoInputErrorMessage } from '@/components/promo-code/error-messages';
import { useValidatePromoCode } from '@/services/promo-code/use-validate-promo-code';
import type {
	ValidatePromoCodeResponse,
	ValidatedPromoCode,
} from '@/types/promo-code';

interface UsePromoCodeValidationOptions {
	raffleId: string;
	initialCode?: string;
	onValidCode: (promo: ValidatedPromoCode) => void;
}

interface UsePromoCodeValidationResult {
	code: string;
	setCode: (next: string) => void;
	isValidating: boolean;
	validatedPromo: ValidatedPromoCode | null;
	error: string | null;
	setError: (next: string | null) => void;
	isExpanded: boolean;
	setIsExpanded: (next: boolean) => void;
	validate: (codeToValidate?: string) => Promise<void>;
	removeCode: () => void;
	resetCode: () => void;
}

/**
 * Collapses the validator response into a `ValidatedPromoCode` for the store.
 * `value` carries the per-ticket display preview (used by labels); `rawValue`
 * carries the unmodified host-set promo value (used by all checkout math).
 */
function buildValidatedPromo(
	code: string,
	response: Omit<ValidatePromoCodeResponse, 'valid'>,
): ValidatedPromoCode {
	const value =
		response.ticketsGranted !== undefined
			? response.ticketsGranted.toString()
			: (response.discountAmount ?? '0');
	return {
		valid: true,
		code,
		type: response.type,
		value,
		rawValue: response.rawValue,
	};
}

interface ValidationState {
	readonly code: string;
	readonly setCode: React.Dispatch<React.SetStateAction<string>>;
	readonly isValidating: boolean;
	readonly validatedPromo: ValidatedPromoCode | null;
	readonly setValidatedPromo: React.Dispatch<
		React.SetStateAction<ValidatedPromoCode | null>
	>;
	readonly error: string | null;
	readonly setError: React.Dispatch<React.SetStateAction<string | null>>;
	readonly isExpanded: boolean;
	readonly setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
	readonly runValidation: (targetCode: string) => Promise<void>;
}

/**
 * State + the async `runValidation` callback. Extracted so the public
 * hook stays under the project-wide function-length cap; not designed
 * for reuse outside this file.
 *
 * `onValidCode` lives in a latest-ref so `runValidation`'s identity stays
 * stable across consumer-prop renders. Without the ref, an unmemoized
 * parent callback would invalidate every dependent `useCallback` below
 * and re-fire the auto-validate effect on every render.
 */
function useValidationState(
	raffleId: string,
	initialCode: string | undefined,
	onValidCode: (promo: ValidatedPromoCode) => void,
): ValidationState {
	const validate = useValidatePromoCode();
	const [isExpanded, setIsExpanded] = useState(!!initialCode);
	const [code, setCode] = useState(initialCode?.trim().toUpperCase() || '');
	const [isValidating, setIsValidating] = useState(false);
	const [validatedPromo, setValidatedPromo] =
		useState<ValidatedPromoCode | null>(null);
	const [error, setError] = useState<string | null>(null);

	const onValidCodeRef = useRef(onValidCode);
	useEffect(() => {
		onValidCodeRef.current = onValidCode;
	});

	const runValidation = useCallback(
		async function runValidation(targetCode: string): Promise<void> {
			setIsValidating(true);
			setError(null);
			const result = await validate(raffleId, targetCode);
			setIsValidating(false);
			if (!result.success) {
				setError(getPromoInputErrorMessage(result.error));
				return;
			}
			const promo = buildValidatedPromo(targetCode, result.data);
			setCode(targetCode);
			setValidatedPromo(promo);
			onValidCodeRef.current(promo);
		},
		[raffleId, validate],
	);

	return {
		code,
		setCode,
		isValidating,
		validatedPromo,
		setValidatedPromo,
		error,
		setError,
		isExpanded,
		setIsExpanded,
		runValidation,
	};
}

/**
 * Auto-validates a URL-provided initial code on mount and whenever it changes
 * to a different non-empty value. The ref-backed single-shot guard collapses
 * Strict Mode double-fires and identity-only re-renders to one API call per
 * distinct code. Listed under the "legitimate `useEffect`" patterns in
 * `.claude/rules/react-effects.md` (one-time external sync keyed by an
 * external param). Returned ref is exposed so manual remove/reset can clear
 * the guard, allowing the same `?code=` to auto-validate again after manual
 * removal.
 */
function useAutoValidateInitialCode(
	initialCode: string | undefined,
	validatedPromoCode: string | undefined,
	runValidation: (targetCode: string) => Promise<void>,
): React.RefObject<string | null> {
	const autoValidatedCodeRef = useRef<string | null>(null);
	useEffect(
		function autoValidateInitialCode() {
			const normalized = initialCode?.trim().toUpperCase() ?? '';
			if (!normalized) {
				autoValidatedCodeRef.current = null;
				return;
			}
			if (validatedPromoCode === normalized) return;
			if (autoValidatedCodeRef.current === normalized) return;
			autoValidatedCodeRef.current = normalized;
			void runValidation(normalized);
		},
		[initialCode, validatedPromoCode, runValidation],
	);
	return autoValidatedCodeRef;
}

/**
 * Owns the promo-code validation lifecycle — local input state, the
 * async validator call, auto-validation of an initial URL-provided
 * code, and the remove/reset affordances. Keeps the UI component
 * focused on render branches.
 *
 * @returns State + mutators for a promo code input.
 */
export function usePromoCodeValidation({
	raffleId,
	initialCode,
	onValidCode,
}: UsePromoCodeValidationOptions): UsePromoCodeValidationResult {
	const state = useValidationState(raffleId, initialCode, onValidCode);
	const autoValidatedCodeRef = useAutoValidateInitialCode(
		initialCode,
		state.validatedPromo?.code,
		state.runValidation,
	);

	const {
		code,
		runValidation,
		setCode,
		setValidatedPromo,
		setError,
		setIsExpanded,
	} = state;

	const manualValidate = useCallback(
		async function manualValidate(codeToValidate?: string): Promise<void> {
			const targetCode = (codeToValidate ?? code).trim().toUpperCase();
			if (!targetCode) return;
			await runValidation(targetCode);
		},
		[code, runValidation],
	);

	const removeCode = useCallback(
		function removeCode() {
			autoValidatedCodeRef.current = null;
			setCode('');
			setValidatedPromo(null);
			setError(null);
			setIsExpanded(false);
		},
		[autoValidatedCodeRef, setCode, setValidatedPromo, setError, setIsExpanded],
	);

	const resetCode = useCallback(
		function resetCode() {
			autoValidatedCodeRef.current = null;
			setCode('');
			setError(null);
			setIsExpanded(false);
		},
		[autoValidatedCodeRef, setCode, setError, setIsExpanded],
	);

	return {
		code: state.code,
		setCode: state.setCode,
		isValidating: state.isValidating,
		validatedPromo: state.validatedPromo,
		error: state.error,
		setError: state.setError,
		isExpanded: state.isExpanded,
		setIsExpanded: state.setIsExpanded,
		validate: manualValidate,
		removeCode,
		resetCode,
	};
}
