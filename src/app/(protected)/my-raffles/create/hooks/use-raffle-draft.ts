'use client';

import { useCallback, useEffect, useState } from 'react';
import { raffleDraftSchema, type RaffleDraftData } from '../schema';

const DRAFT_STORAGE_KEY = 'raffly-raffle-draft';
const DRAFT_EXPIRATION_DAYS = 7;

/**
 * Custom hook for managing raffle draft persistence in localStorage
 * Handles SSR safety, Zod validation, and 7-day expiration
 *
 * @returns Draft management utilities
 */
export function useRaffleDraft() {
	const [draft, setDraft] = useState<RaffleDraftData | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	/**
	 * Checks if a draft has expired based on savedAt timestamp
	 * @param savedAt - ISO date string when draft was saved
	 * @returns true if draft is older than 7 days
	 */
	function isDraftExpired(savedAt: string): boolean {
		const savedDate = new Date(savedAt);
		const now = new Date();
		const diffTime = now.getTime() - savedDate.getTime();
		const diffDays = diffTime / (1_000 * 60 * 60 * 24); // 7 days
		return diffDays >= DRAFT_EXPIRATION_DAYS;
	}

	/**
	 * Loads draft from localStorage on mount
	 * Validates with Zod schema and checks expiration
	 */
	useEffect(() => {
		if (typeof window === 'undefined') {
			setIsLoading(false);
			return;
		}

		try {
			const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
			if (!stored) {
				setIsLoading(false);
				return;
			}

			const parsed = JSON.parse(stored);
			const validated = raffleDraftSchema.safeParse(parsed);

			if (!validated.success) {
				console.warn('Invalid draft data, clearing localStorage');
				localStorage.removeItem(DRAFT_STORAGE_KEY);
				setIsLoading(false);
				return;
			}

			if (isDraftExpired(validated.data.savedAt)) {
				console.warn('Draft expired, clearing localStorage');
				localStorage.removeItem(DRAFT_STORAGE_KEY);
				setIsLoading(false);
				return;
			}

			setDraft(validated.data);
		} catch (error) {
			console.error('Failed to load draft:', error);
			localStorage.removeItem(DRAFT_STORAGE_KEY);
		} finally {
			setIsLoading(false);
		}
	}, []);

	/**
	 * Saves draft data to localStorage
	 * Does not update state to avoid triggering the load effect
	 * @param data - Partial raffle form data to save
	 * @param currentStep - Current step index to restore position
	 */
	const saveDraft = useCallback(
		(data: Omit<RaffleDraftData, 'savedAt'>, currentStep: number) => {
			if (typeof window === 'undefined') return;

			const draftData: RaffleDraftData = {
				...data,
				currentStep,
				savedAt: new Date().toISOString(),
			};

			try {
				localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
			} catch (error) {
				console.error('Failed to save draft:', error);
			}
		},
		[],
	);

	/**
	 * Clears draft from localStorage
	 */
	const clearDraft = useCallback(() => {
		if (typeof window === 'undefined') return;

		localStorage.removeItem(DRAFT_STORAGE_KEY);
		setDraft(null);
	}, []);

	const hasDraft = draft !== null;

	return {
		draft,
		hasDraft,
		saveDraft,
		clearDraft,
		isLoading,
	};
}
