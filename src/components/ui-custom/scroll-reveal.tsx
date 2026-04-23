'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef } from 'react';

import { cn } from '@/lib/class-names';

gsap.registerPlugin(ScrollTrigger);

interface ScrollRevealProps {
	children: React.ReactNode;
	className?: string;
	delay?: number;
	y?: number;
	duration?: number;
}

/**
 * ScrollReveal Component
 *
 * GSAP ScrollTrigger wrapper for fade-in-up animations on viewport entry.
 */
export function ScrollReveal({
	children,
	className,
	delay = 0,
	y = 40,
	duration = 0.6,
}: ScrollRevealProps) {
	const ref = useRef<HTMLDivElement>(null);

	useGSAP(
		() => {
			if (!ref.current) return;

			gsap.fromTo(
				ref.current,
				{
					opacity: 0,
					y,
				},
				{
					opacity: 1,
					y: 0,
					duration,
					delay,
					ease: 'power2.out',
					scrollTrigger: {
						trigger: ref.current,
						start: 'top 85%',
						toggleActions: 'play none none none',
					},
				},
			);
		},
		{ scope: ref },
	);

	return (
		<div ref={ref} className={cn('opacity-0', className)}>
			{children}
		</div>
	);
}

interface ScrollRevealStaggerProps {
	children: React.ReactNode;
	className?: string;
	stagger?: number;
	y?: number;
	duration?: number;
}

/**
 * ScrollRevealStagger Component
 *
 * Staggers animations for direct children elements.
 */
export function ScrollRevealStagger({
	children,
	className,
	stagger = 0.1,
	y = 40,
	duration = 0.6,
}: ScrollRevealStaggerProps) {
	const ref = useRef<HTMLDivElement>(null);

	useGSAP(
		() => {
			if (!ref.current) return;

			// Use children property for direct children
			const elements = Array.from(ref.current.children);
			if (elements.length === 0) return;

			gsap.fromTo(
				elements,
				{
					opacity: 0,
					y,
				},
				{
					opacity: 1,
					y: 0,
					duration,
					stagger,
					ease: 'power2.out',
					scrollTrigger: {
						trigger: ref.current,
						start: 'top 85%',
						toggleActions: 'play none none none',
					},
				},
			);
		},
		{ scope: ref },
	);

	return (
		<div ref={ref} className={className}>
			{children}
		</div>
	);
}
