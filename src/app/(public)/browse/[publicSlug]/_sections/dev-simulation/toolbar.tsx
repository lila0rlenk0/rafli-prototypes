'use client';

import { ChevronDown, FlaskConical, RotateCcw, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/class-names';

import { SIM_PHASE, type SimPhase } from './phases';
import { useRaffleSimulation } from './store';

interface PhaseOption {
	value: SimPhase;
	label: string;
	hint: string;
}

const PHASE_OPTIONS: readonly PhaseOption[] = [
	{
		value: SIM_PHASE.EXPIRED,
		label: 'Phase B — Expired',
		hint: 'live · endAt passed',
	},
	{
		value: SIM_PHASE.DRAWING,
		label: 'Phase C — Drawing',
		hint: 'ended · no winners',
	},
	{
		value: SIM_PHASE.FULFILLING,
		label: 'Phase D — Fulfilling',
		hint: 'fulfilling · winners landed',
	},
	{
		value: SIM_PHASE.REVEAL_WIN,
		label: 'Phase E — Reveal (win)',
		hint: 'intro card → animation → won',
	},
	{
		value: SIM_PHASE.WINNER,
		label: 'Phase E — You won',
		hint: 'completed · viewer wins',
	},
	{
		value: SIM_PHASE.REVEAL_LOSE,
		label: 'Phase E — Reveal (lose)',
		hint: 'intro card → animation → lost',
	},
	{
		value: SIM_PHASE.LOSER,
		label: 'Phase E — You lost',
		hint: 'completed · viewer loses',
	},
];

/**
 * Bottom-right floating panel that drives the raffle lifecycle simulator.
 * Mounted only by `RaffleSimulationProvider`, which itself only renders
 * outside production builds — so this component never ships to the live
 * audience even if imports leak.
 *
 * Collapsed by default to keep the page chrome clean; expanding reveals
 * one button per phase plus a reset.
 *
 * @returns Floating dev toolbar (dev/staging only)
 */
export function RaffleSimulationToolbar() {
	const { phase, setPhase } = useRaffleSimulation();
	const [isExpanded, setIsExpanded] = useState(false);
	const isActive = phase !== SIM_PHASE.IDLE;

	function handleReset() {
		setPhase(SIM_PHASE.IDLE);
	}

	function handleSelectPhase(next: SimPhase) {
		setPhase(next);
	}

	if (!isExpanded) {
		return (
			<button
				type="button"
				onClick={function expand() {
					setIsExpanded(true);
				}}
				className={cn(
					'fixed right-4 bottom-4 z-(--z-toast) flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold shadow-lg',
					'bg-brand-dark text-on-dark hover:bg-foreground transition-colors',
					isActive && 'ring-brand-yellow ring-2 ring-offset-2',
				)}
				aria-label="Open raffle simulation toolbar"
			>
				<FlaskConical aria-hidden className="size-4" />
				{isActive ? `Sim: ${phase}` : 'Simulate lifecycle'}
			</button>
		);
	}

	return (
		<div className="border-border bg-card fixed right-4 bottom-4 z-(--z-toast) flex w-72 flex-col gap-3 rounded-2xl border p-4 shadow-xl">
			<header className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<FlaskConical aria-hidden className="text-brand-dark size-4" />
					<p className="text-foreground text-sm font-semibold">
						Lifecycle simulator
					</p>
				</div>
				<button
					type="button"
					onClick={function collapse() {
						setIsExpanded(false);
					}}
					className="text-muted-foreground hover:text-foreground transition-colors"
					aria-label="Collapse simulation toolbar"
				>
					<ChevronDown aria-hidden className="size-4" />
				</button>
			</header>
			<p className="text-muted-foreground text-xs">
				Dev/staging only. Overrides the page client-side — refresh to clear.
			</p>
			<div className="flex flex-col gap-1">
				{PHASE_OPTIONS.map(function renderOption(option) {
					const isSelected = phase === option.value;
					return (
						<button
							key={option.value}
							type="button"
							onClick={function selectThisPhase() {
								handleSelectPhase(option.value);
							}}
							aria-pressed={isSelected}
							className={cn(
								'flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors',
								isSelected
									? 'border-brand-dark bg-brand-dark text-on-dark'
									: 'border-border bg-card hover:border-brand-dark/40 text-foreground',
							)}
						>
							<span className="text-sm font-semibold">{option.label}</span>
							<span
								className={cn(
									'text-xs',
									isSelected ? 'text-on-dark/80' : 'text-muted-foreground',
								)}
							>
								{option.hint}
							</span>
						</button>
					);
				})}
			</div>
			<Button
				variant="outline"
				size="sm"
				onClick={handleReset}
				disabled={!isActive}
				className="rounded-full"
			>
				{isActive ? (
					<>
						<X aria-hidden />
						Stop simulating
					</>
				) : (
					<>
						<RotateCcw aria-hidden />
						Reset
					</>
				)}
			</Button>
		</div>
	);
}
