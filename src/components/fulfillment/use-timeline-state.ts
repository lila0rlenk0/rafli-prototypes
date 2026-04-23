'use client';

import { useCallback, useState } from 'react';

import type { ShippingInfo, Winning, WinningStatus } from '@/types/winning';

type StepStatus = 'completed' | 'active' | 'pending';

interface FulfillmentTimelineState {
	currentStatus: WinningStatus;
	setCurrentStatus: (status: WinningStatus) => void;
	shippingInfo: ShippingInfo | null;
	setShippingInfo: (info: ShippingInfo | null) => void;
	isConfirming: boolean;
	setIsConfirming: (value: boolean) => void;
	isMarkingDelivered: boolean;
	setIsMarkingDelivered: (value: boolean) => void;
	getStepStatus: (step: number) => StepStatus;
}

/**
 * Resolves the "active step" anchor for the timeline.
 *  - `0` → every step still pending (unknown status).
 *  - `1..4` → that step is active, steps before it are completed.
 *  - `5+` → every step completed (terminal status).
 *
 * The "sent" status is role-aware because winners skip the host's
 * `mark-as-delivered` step and jump straight to "confirm receipt".
 *
 * @param status - Current winning status
 * @param isHost - Whether viewer is the raffle host
 * @returns Active step index (0..5)
 */
export function resolveActiveStep(
	status: WinningStatus | undefined,
	options: { isHost: boolean },
): number {
	const { isHost } = options;
	switch (status) {
		case 'pending':
		case 'pending_partial_fulfillment':
			return 1;
		case 'awaiting_host':
			return 2;
		case 'sent':
			return isHost ? 3 : 4;
		case 'delivered':
		case 'disputed':
			return 4;
		case 'received':
		case 'resolved':
			return 5;
		default:
			return 0;
	}
}

/**
 * Derives per-step status from the active-step anchor.
 *
 * @param step - 1-indexed step number
 * @param activeStep - Output of `resolveActiveStep`
 * @returns Visual status for the step circle + connector
 */
export function deriveStepStatus(step: number, activeStep: number): StepStatus {
	// 0 means "no data yet" — show every step as pending.
	if (activeStep === 0) return 'pending';
	// 5+ means terminal — every step is completed.
	if (activeStep >= 5) return 'completed';
	if (step < activeStep) return 'completed';
	if (step === activeStep) return 'active';
	return 'pending';
}

/**
 * Timeline state owner. Seeds from the initial winning record, exposes
 * mutators for optimistic updates after server actions, and derives the
 * per-step status via the `getStepStatus` selector.
 *
 * @param winning - Initial winning record from the server
 * @param isHost - Whether viewer is the raffle host (affects active-step anchor)
 * @returns State + mutators + per-step status selector
 */
export function useFulfillmentTimelineState(
	winning: Winning,
	options: { isHost: boolean },
): FulfillmentTimelineState {
	const { isHost } = options;
	const [currentStatus, setCurrentStatus] = useState<WinningStatus>(
		winning.status,
	);
	const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(
		winning.shippingInfo ?? null,
	);
	const [isConfirming, setIsConfirming] = useState(false);
	const [isMarkingDelivered, setIsMarkingDelivered] = useState(false);

	// useCallback: referenced inside effects / memos by step components — keep
	// stable across renders so we don't re-evaluate unrelated memos.
	const getStepStatus = useCallback(
		(step: number): StepStatus => {
			const activeStep = resolveActiveStep(currentStatus, { isHost });
			return deriveStepStatus(step, activeStep);
		},
		[currentStatus, isHost],
	);

	return {
		currentStatus,
		setCurrentStatus,
		shippingInfo,
		setShippingInfo,
		isConfirming,
		setIsConfirming,
		isMarkingDelivered,
		setIsMarkingDelivered,
		getStepStatus,
	};
}
