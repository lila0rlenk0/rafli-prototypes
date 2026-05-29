'use client';

import { useState, type CSSProperties } from 'react';

import { cn } from '@/lib/class-names';

import {
	ACCENT_CARD_CLASSES,
	ORBIT_PERIOD_LOADING_MS,
	ORBIT_PERIOD_REVEALING_MS,
	ORBIT_STAGGER_MS,
	PARTICIPANT_SAMPLE_SIZE,
	truncateOrbitLabel,
	type OrbitalParticipant,
} from './reveal-state';

// The sidebar draw card passes container-relative lengths (`cqi`) so the ring
// always fits its parent; the reveal dialog leaves them undefined to use the
// design-system pixel defaults.
interface OrbitalCardsProps {
	participants: OrbitalParticipant[];
	/** When true, slows the orbit to the revealing-phase cadence. */
	isRevealing?: boolean;
	/** Override orbit radius as a CSS length. Defaults to the --orbit-r token (150px). */
	radius?: string;
	/** Override per-card width/height as a CSS length. Defaults to --spacing-reveal-orbit-card (110px). */
	cardSize?: string;
}

/**
 * Container ring of participant cards rotating during the loading +
 * revealing phases. Each card drives BOTH its orbit position AND its
 * upright orientation through a single transform stack
 * (`rotate(θ) translateX(R) rotate(-θ)`) — no parent/child counter-
 * rotation, so the cards can never desync from the container's frame.
 *
 * @returns Absolutely-positioned orbital ring
 */
export function OrbitalCards({
	participants: initialParticipants,
	isRevealing = false,
	radius,
	cardSize,
}: OrbitalCardsProps) {
	// Lock the random sample at mount so polling refreshes (router.refresh
	// on a server-rendered draw card) don't reshuffle the ring mid-orbit.
	// Replay / raffle change remounts this component and re-rolls.
	const [participants] = useState(function lockInitialSample() {
		return initialParticipants;
	});
	const periodMs = isRevealing
		? ORBIT_PERIOD_REVEALING_MS
		: ORBIT_PERIOD_LOADING_MS;
	return (
		<div aria-hidden className="pointer-events-none absolute inset-0">
			{participants.map(function renderCard(participant, index) {
				return (
					<OrbitalCard
						key={participant.id}
						participant={participant}
						index={index}
						isRevealing={isRevealing}
						periodMs={periodMs}
						radius={radius}
						cardSize={cardSize}
					/>
				);
			})}
		</div>
	);
}

interface OrbitalCardProps {
	participant: OrbitalParticipant;
	index: number;
	isRevealing: boolean;
	periodMs: number;
	radius?: string;
	cardSize?: string;
}

/**
 * Single orbital card. Anchored at the container's centre via
 * `top:50% left:50%`; the `reveal-orbit-card-around` keyframe owns
 * the visible position via its transform composition. Per-card phase
 * (`--orbit-phase`) is a negative animation-delay that spreads the
 * cards around the ring at mount, and `--card-delay` staggers the
 * scale-in entrance.
 *
 * @returns Card mounted at orbit angle (index / N) × 360°, upright
 */
function OrbitalCard({
	participant,
	index,
	isRevealing,
	periodMs,
	radius,
	cardSize,
}: OrbitalCardProps) {
	// Negative phase = animation starts pre-advanced, so the card
	// appears at angle (index / N) × 360° at t=0 and all cards orbit
	// together while preserving their relative positions on the ring.
	const orbitPhaseMs = -(index * periodMs) / PARTICIPANT_SAMPLE_SIZE;
	const angleDeg = (index * 360) / PARTICIPANT_SAMPLE_SIZE;
	const orbitRadius = radius ?? 'var(--orbit-r, 150px)';
	const style: CSSProperties = {
		'--card-delay': `${index * ORBIT_STAGGER_MS}ms`,
		'--orbit-phase': `${orbitPhaseMs}ms`,
		transform: `translate(-50%, -50%) rotate(${angleDeg}deg) translateX(${orbitRadius}) rotate(-${angleDeg}deg)`,
		...(radius !== undefined ? { '--orbit-r': radius } : {}),
		...(cardSize !== undefined ? { width: cardSize, height: cardSize } : {}),
	} as CSSProperties;
	const colorClass = ACCENT_CARD_CLASSES[index % ACCENT_CARD_CLASSES.length];
	return (
		<div
			style={style}
			className={cn(
				'absolute top-1/2 left-1/2 flex flex-col items-center justify-center rounded-2xl px-2 text-center',
				cardSize === undefined && 'size-(--spacing-reveal-orbit-card)',
				isRevealing
					? 'motion-safe:animate-reveal-orbit-card-revealing'
					: 'motion-safe:animate-reveal-orbit-card',
				colorClass,
			)}
		>
			<p className="text-foreground text-label-sm w-full font-semibold">
				{truncateOrbitLabel(participant.label)}
			</p>
			<p className="text-ink-500 text-label-sm mt-1">
				{participant.tickets === 1
					? '1 entry'
					: `${participant.tickets} entries`}
			</p>
		</div>
	);
}
