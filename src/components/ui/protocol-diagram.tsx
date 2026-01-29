'use client';

import { CheckCircle2, Dice5, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

const STEPS = [
	{
		id: 'commit',
		label: 'COMMIT',
		description: 'Tickets locked',
		icon: Lock,
		color: 'bg-purple-500',
		borderColor: 'border-purple-500',
		textColor: 'text-purple-600',
	},
	{
		id: 'random',
		label: 'RANDOM',
		description: 'VRF generated',
		icon: Dice5,
		color: 'bg-blue-500',
		borderColor: 'border-blue-500',
		textColor: 'text-blue-600',
	},
	{
		id: 'reveal',
		label: 'REVEAL',
		description: 'Winner selected',
		icon: CheckCircle2,
		color: 'bg-green-500',
		borderColor: 'border-green-500',
		textColor: 'text-green-600',
	},
] as const;

/**
 * ProtocolDiagram Component
 *
 * Animated 3-step horizontal timeline showing the commit-reveal protocol.
 * Animates on viewport entry.
 */
export function ProtocolDiagram() {
	const ref = useRef<HTMLDivElement>(null);
	const isInView = useInView(ref, { once: true, margin: '-100px' });

	return (
		<div ref={ref} className="py-8">
			<div className="relative flex items-center justify-between">
				{/* Connecting line */}
				<div className="absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 bg-neutral-200">
					<motion.div
						initial={{ width: 0 }}
						animate={isInView ? { width: '100%' } : { width: 0 }}
						transition={{ duration: 1, ease: 'easeOut' }}
						className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-green-500"
					/>
				</div>

				{/* Steps */}
				{STEPS.map((step, index) => {
					const Icon = step.icon;
					return (
						<motion.div
							key={step.id}
							initial={{ opacity: 0, y: 20 }}
							animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
							transition={{ duration: 0.5, delay: 0.3 + index * 0.2 }}
							className="relative z-10 flex flex-col items-center"
						>
							<motion.div
								initial={{ scale: 0 }}
								animate={isInView ? { scale: 1 } : { scale: 0 }}
								transition={{
									duration: 0.4,
									delay: 0.3 + index * 0.2,
									type: 'spring',
									stiffness: 200,
								}}
								className={`flex size-16 items-center justify-center rounded-full border-4 bg-white ${step.borderColor}`}
							>
								<Icon className={`size-7 ${step.textColor}`} />
							</motion.div>
							<div className="mt-3 text-center">
								<p className={`text-sm font-bold ${step.textColor}`}>
									{step.label}
								</p>
								<p className="text-xs text-neutral-500">{step.description}</p>
							</div>
						</motion.div>
					);
				})}
			</div>

			{/* Time arrow */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={isInView ? { opacity: 1 } : { opacity: 0 }}
				transition={{ delay: 1 }}
				className="mt-6 flex items-center justify-center gap-2 text-xs text-neutral-400"
			>
				<span>Time</span>
				<svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
				</svg>
			</motion.div>
		</div>
	);
}
