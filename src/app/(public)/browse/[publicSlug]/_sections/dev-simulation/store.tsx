'use client';

import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
	type ReactNode,
} from 'react';

import { SIM_PHASE, type SimPhase } from './phases';

interface RaffleSimulationContextValue {
	phase: SimPhase;
	setPhase: (phase: SimPhase) => void;
}

const RaffleSimulationContext =
	createContext<RaffleSimulationContextValue | null>(null);

interface RaffleSimulationProviderProps {
	children: ReactNode;
}

/**
 * Holds the active simulation phase shared between the floating toolbar and
 * the overlay panel. Default phase is `idle` so the page renders normally
 * until a developer flips a control.
 *
 * @returns Provider exposing phase + setter to descendants
 */
export function RaffleSimulationProvider({
	children,
}: RaffleSimulationProviderProps) {
	const [phase, setPhaseState] = useState<SimPhase>(SIM_PHASE.IDLE);

	const setPhase = useCallback(function updatePhase(next: SimPhase) {
		setPhaseState(next);
	}, []);

	const value = useMemo<RaffleSimulationContextValue>(
		function memoizeValue() {
			return { phase, setPhase };
		},
		[phase, setPhase],
	);

	return (
		<RaffleSimulationContext.Provider value={value}>
			{children}
		</RaffleSimulationContext.Provider>
	);
}

/**
 * Reads the active simulation phase. Throws when used outside a
 * `RaffleSimulationProvider` so a stray call in production code surfaces
 * loudly rather than silently no-op-ing.
 *
 * @returns Current simulation phase + setter
 */
export function useRaffleSimulation(): RaffleSimulationContextValue {
	const ctx = useContext(RaffleSimulationContext);
	if (ctx === null) {
		throw new Error(
			'useRaffleSimulation must be used inside a <RaffleSimulationProvider>',
		);
	}
	return ctx;
}
