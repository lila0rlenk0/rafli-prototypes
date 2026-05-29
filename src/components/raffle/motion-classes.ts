// Shared CSS-keyframe entrance classes for celebration surfaces (reveal dialog,
// entries-confirmed modal). Centralised here so both surfaces stagger their
// headlines/CTAs with the same fade + slide + back-out spring without
// duplicating the class string. No JSX, no 'use client' — leaf module.

// Cascade entrance for individual content items (headline, CTA, meta text).
// Each call site appends its own `motion-safe:delay-{N}` to space the chain.
export const STAGE_ENTRANCE_CLASS =
	'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:ease-(--ease-back-out) motion-safe:fill-mode-backwards';

// Entrance for the entire frame container — slightly larger slide offset to
// separate the frame arrival from the per-item cascade above it.
export const FRAME_ENTRANCE_CLASS =
	'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-500 motion-safe:ease-(--ease-back-out)';
