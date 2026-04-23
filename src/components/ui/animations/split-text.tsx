'use client';

import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText as GSAPSplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, GSAPSplitText, useGSAP);

function computeStartSign(value: number, unit: string): string {
	if (value === 0) return '';
	if (value < 0) return `-=${Math.abs(value)}${unit}`;
	return `+=${value}${unit}`;
}

export interface SplitTextProps {
	text: string;
	className?: string;
	delay?: number;
	duration?: number;
	ease?: string | ((t: number) => number);
	splitType?: 'chars' | 'words' | 'lines' | 'words, chars';
	from?: gsap.TweenVars;
	to?: gsap.TweenVars;
	threshold?: number;
	rootMargin?: string;
	tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
	textAlign?: React.CSSProperties['textAlign'];
	onLetterAnimationComplete?: () => void;
}

const SplitText: React.FC<SplitTextProps> = ({
	text,
	className = '',
	delay = 50,
	duration = 1.25,
	ease = 'power3.out',
	splitType = 'chars',
	from = { opacity: 0, y: 40 },
	to = { opacity: 1, y: 0 },
	threshold = 0.1,
	rootMargin = '-100px',
	tag = 'p',
	textAlign = 'center',
	onLetterAnimationComplete,
}) => {
	const ref = useRef<HTMLParagraphElement>(null);
	const animationCompletedRef = useRef(false);
	const onCompleteRef = useRef(onLetterAnimationComplete);
	// Initialize synchronously if fonts are already loaded (avoids an extra render),
	// otherwise the effect below will resolve the async font-ready promise.
	// Guard against SSR where `document` is not defined.
	const [fontsLoaded, setFontsLoaded] = useState<boolean>(
		() => typeof document !== 'undefined' && document.fonts.status === 'loaded',
	);

	// GSAP callbacks outlive a single render. Sync the latest completion handler
	// after commit so animation finish always calls the freshest prop.
	useEffect(() => {
		onCompleteRef.current = onLetterAnimationComplete;
	}, [onLetterAnimationComplete]);

	useEffect(() => {
		// Already loaded synchronously via useState initializer
		if (fontsLoaded) return;

		// Wait for fonts to finish loading, with cancellation guard
		// to prevent setState on unmounted component
		let cancelled = false;
		document.fonts.ready.then(() => {
			if (!cancelled) setFontsLoaded(true);
		});
		return () => {
			cancelled = true;
		};
	}, [fontsLoaded]);

	useGSAP(
		() => {
			if (!ref.current || !text || !fontsLoaded) return;
			// Prevent re-animation if already completed
			if (animationCompletedRef.current) return;
			const el = ref.current as HTMLElement & {
				_rbsplitInstance?: GSAPSplitText;
			};

			if (el._rbsplitInstance) {
				try {
					el._rbsplitInstance.revert();
				} catch {}
				el._rbsplitInstance = undefined;
			}

			const startPct = (1 - threshold) * 100;
			const marginMatch = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(rootMargin);
			const marginValue = marginMatch ? parseFloat(marginMatch[1]) : 0;
			const marginUnit = marginMatch ? marginMatch[2] || 'px' : 'px';
			const sign = computeStartSign(marginValue, marginUnit);
			const start = `top ${startPct}%${sign}`;
			let targets: Element[] = [];
			const assignTargets = (self: GSAPSplitText) => {
				if (
					splitType.includes('chars') &&
					(self as GSAPSplitText).chars?.length
				)
					targets = (self as GSAPSplitText).chars;
				if (!targets.length && splitType.includes('words') && self.words.length)
					targets = self.words;
				if (!targets.length && splitType.includes('lines') && self.lines.length)
					targets = self.lines;
				if (!targets.length) targets = self.chars || self.words || self.lines;
			};
			const splitInstance = new GSAPSplitText(el, {
				type: splitType,
				smartWrap: true,
				autoSplit: splitType === 'lines',
				linesClass: 'split-line',
				wordsClass: 'split-word',
				charsClass: 'split-char',
				reduceWhiteSpace: false,
				onSplit: (self: GSAPSplitText) => {
					assignTargets(self);
					return gsap.fromTo(
						targets,
						{ ...from },
						{
							...to,
							duration,
							ease,
							stagger: delay / 1000,
							scrollTrigger: {
								trigger: el,
								start,
								once: true,
								fastScrollEnd: true,
								anticipatePin: 0.4,
							},
							onComplete: () => {
								animationCompletedRef.current = true;
								onCompleteRef.current?.();
							},
							willChange: 'transform, opacity',
							force3D: true,
						},
					);
				},
			});
			el._rbsplitInstance = splitInstance;
			return () => {
				ScrollTrigger.getAll().forEach(st => {
					if (st.trigger === el) st.kill();
				});
				try {
					splitInstance.revert();
				} catch {}
				el._rbsplitInstance = undefined;
			};
		},
		{
			dependencies: [
				text,
				delay,
				duration,
				ease,
				splitType,
				JSON.stringify(from),
				JSON.stringify(to),
				threshold,
				rootMargin,
				fontsLoaded,
			],
			scope: ref,
		},
	);

	const renderTag = () => {
		const style: React.CSSProperties = {
			textAlign,
			wordWrap: 'break-word',
			willChange: 'transform, opacity',
		};
		const classes = `split-parent overflow-hidden inline-block whitespace-normal ${className}`;
		switch (tag) {
			case 'h1':
				return (
					<h1 ref={ref} style={style} className={classes}>
						{text}
					</h1>
				);
			case 'h2':
				return (
					<h2 ref={ref} style={style} className={classes}>
						{text}
					</h2>
				);
			case 'h3':
				return (
					<h3 ref={ref} style={style} className={classes}>
						{text}
					</h3>
				);
			case 'h4':
				return (
					<h4 ref={ref} style={style} className={classes}>
						{text}
					</h4>
				);
			case 'h5':
				return (
					<h5 ref={ref} style={style} className={classes}>
						{text}
					</h5>
				);
			case 'h6':
				return (
					<h6 ref={ref} style={style} className={classes}>
						{text}
					</h6>
				);
			default:
				return (
					<p ref={ref} style={style} className={classes}>
						{text}
					</p>
				);
		}
	};

	return renderTag();
};

export default SplitText;
