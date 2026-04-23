'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { getPromoInputErrorMessage } from '@/components/promo-code/error-messages';
import { useValidatePromoCode } from '@/services/promo-code/use-validate-promo-code';
import type { ValidatedPromoCode } from '@/types/promo-code';

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

interface ValidatedResponse {
	type: ValidatedPromoCode['type'];
	ticketsGranted?: number;
	discountAmount?: string;
}

type RunValidation = (targetCode: string) => Promise<void>;

/**
 * Collapses the validator response into a single `value` string so the
 * UI renders without branching on the payload shape.
 */
function buildValidatedPromo(
	code: string,
	response: ValidatedResponse,
): ValidatedPromoCode {
	const value =
		response.ticketsGranted !== undefined
			? response.ticketsGranted.toString()
			: (response.discountAmount ?? '0');
	return { valid: true, code, type: response.type, value };
}

interface ResetCallbacksOptions {
	autoValidatedCodeRef: React.RefObject<string | null>;
	setCode: (next: string) => void;
	setValidatedPromo: (next: ValidatedPromoCode | null) => void;
	setError: (next: string | null) => void;
	setIsExpanded: (next: boolean) => void;
}

/**
 * Bundle of reset helpers shared by the remove and cancel affordances.
 * Co-located so the primary hook body stays focused on async validation.
 */
function useResetCallbacks({
	autoValidatedCodeRef,
	setCode,
	setValidatedPromo,
	setError,
	setIsExpanded,
}: ResetCallbacksOptions) {
	const removeCode = useCallback(() => {
		autoValidatedCodeRef.current = null;
		setCode('');
		setValidatedPromo(null);
		setError(null);
		setIsExpanded(false);
	}, [
		autoValidatedCodeRef,
		setCode,
		setValidatedPromo,
		setError,
		setIsExpanded,
	]);

	const resetCode = useCallback(() => {
		autoValidatedCodeRef.current = null;
		setCode('');
		setError(null);
		setIsExpanded(false);
	}, [autoValidatedCodeRef, setCode, setError, setIsExpanded]);

	return { removeCode, resetCode };
}

/**
 * Auto-validates a URL-provided initial code on mount (and whenever the
 * prop changes to a different non-empty value). Uses a ref-backed
 * single-shot guard so React Strict Mode double-fires and identity-only
 * parent rerenders don't repeatedly hit the API. Defers the actual call
 * via `queueMicrotask` so the effect body never runs `setState`
 * synchronously — the rule disallows effect-driven state mutation,
 * including transitively via async helpers.
 */
function useAutoValidateInitialCode(
	initialCode: string | undefined,
	validatedPromoCode: string | undefined,
	runValidation: RunValidation,
) {
	const autoValidatedCodeRef = useRef<string | null>(null);
	useEffect(() => {
		const normalized = initialCode?.trim().toUpperCase() ?? '';
		if (!normalized) {
			autoValidatedCodeRef.current = null;
			return;
		}
		if (validatedPromoCode === normalized) return;
		if (autoValidatedCodeRef.current === normalized) return;
		autoValidatedCodeRef.current = normalized;
		queueMicrotask(() => {
			void runValidation(normalized);
		});
	}, [initialCode, validatedPromoCode, runValidation]);
	return autoValidatedCodeRef;
}

interface ValidationState {
	code: string;
	setCode: (next: string) => void;
	isValidating: boolean;
	validatedPromo: ValidatedPromoCode | null;
	error: string | null;
	setError: (next: string | null) => void;
	isExpanded: boolean;
	setIsExpanded: (next: boolean) => void;
	setValidatedPromo: (next: ValidatedPromoCode | null) => void;
	runValidation: RunValidation;
}

/**
 * Sets up the local state slots + the async `runValidation` callback,
 * along with the ref that keeps the `onValidCode` prop identity stable
 * across renders. Kept small so the top-level hook body stays under the
 * function-length cap.
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
	}, [onValidCode]);

	const runValidation = useCallback<RunValidation>(
		async targetCode => {
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

	const manualValidate = useCallback(
		async (codeToValidate?: string) => {
			const targetCode = (codeToValidate ?? state.code).trim().toUpperCase();
			if (!targetCode) return;
			await state.runValidation(targetCode);
		},
		[state],
	);

	const { removeCode, resetCode } = useResetCallbacks({
		autoValidatedCodeRef,
		setCode: state.setCode,
		setValidatedPromo: state.setValidatedPromo,
		setError: state.setError,
		setIsExpanded: state.setIsExpanded,
	});

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
