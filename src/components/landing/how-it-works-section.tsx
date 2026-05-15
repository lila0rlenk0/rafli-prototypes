import { Briefcase, Users } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/class-names';

interface Step {
	readonly number: string;
	readonly title: string;
	readonly description: string;
}

const HOST_STEPS: readonly Step[] = [
	{
		number: '01',
		title: 'Pass verification',
		description:
			'Hosts are KYC-checked and every sweepstakes is audited before going live.',
	},
	{
		number: '02',
		title: 'Get guidance',
		description:
			'Playbooks, pricing templates, and launch support. A dedicated guide walks you through your first sweepstakes.',
	},
	{
		number: '03',
		title: 'Reach the network',
		description:
			'Access a user base that has distributed over $50M in real rewards.',
	},
];

const PARTICIPANT_STEPS: readonly Step[] = [
	{
		number: '01',
		title: 'Create an account',
		description: 'Sign up in seconds. Email or wallet, no credit card needed.',
	},
	{
		number: '02',
		title: 'Pick your sweepstakes',
		description:
			'Browse live sweepstakes and enter with one tap. Free entry always available.',
	},
	{
		number: '03',
		title: 'Win',
		description:
			'Draws run on-chain. Results are public, verifiable, and final.',
	},
];

/**
 * Two-up "How would you like to participate?" cards on a yellow canvas.
 *
 * Server Component. Mirrors the design's host/participant split: dark card
 * for hosts (B2B, lower volume), light card for participants (B2C, default
 * entry path). The steps are intentionally not numbered in a way that
 * suggests sequence — they are parallel callouts, not a linear funnel.
 *
 * @returns Yellow section with two side-by-side step cards
 */
export function HowItWorksSection() {
	return (
		<section
			id="how-it-works"
			className="bg-brand-yellow border-y-brand-dark scroll-mt-24 border-y"
		>
			<div className="max-w-wide mx-auto px-6 py-20 lg:px-27 lg:py-24">
				<h2 className="font-clash-display text-brand-dark text-headline-lg lg:text-60 mb-12 text-center font-semibold lg:mb-16">
					How would you like to participate?
				</h2>
				<div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
					<StepCard
						tone="dark"
						audience="For businesses"
						title="Host a sweepstakes"
						icon={
							<Briefcase
								aria-hidden="true"
								className="text-brand-mint size-5.5"
							/>
						}
						steps={HOST_STEPS}
						cta={
							<Button asChild className="h-10 self-start px-6">
								<Link href="https://forms.gle/RqihwzjyBcjjwUa97">
									Apply to host
								</Link>
							</Button>
						}
					/>
					<StepCard
						tone="light"
						audience="For participants"
						title="Join a sweepstakes"
						icon={
							<Users aria-hidden="true" className="text-brand-dark size-5.5" />
						}
						steps={PARTICIPANT_STEPS}
						cta={
							<Button asChild className="h-10 self-start px-6">
								<Link href="/browse">Explore sweepstakes</Link>
							</Button>
						}
					/>
				</div>
			</div>
		</section>
	);
}

interface StepCardProps {
	readonly tone: 'dark' | 'light';
	readonly audience: string;
	readonly title: string;
	readonly icon: ReactNode;
	readonly steps: readonly Step[];
	readonly cta: ReactNode;
}

function StepCard({ tone, audience, title, icon, steps, cta }: StepCardProps) {
	const isDark = tone === 'dark';
	return (
		<div
			className={cn(
				'flex flex-col rounded-3xl p-8 lg:p-10',
				isDark
					? 'bg-brand-dark text-background'
					: 'bg-card text-brand-dark border-brand-dark border',
			)}
		>
			<div className="mb-5 flex items-center gap-3.5">
				<div
					className={cn(
						'flex size-12 shrink-0 items-center justify-center rounded-xl border',
						isDark
							? 'border-background/10 bg-background/5'
							: 'bg-brand-sky border-brand-dark',
					)}
				>
					{icon}
				</div>
				<span className="font-clash-display text-headline-sm flex-1 font-semibold">
					{title}
				</span>
				<span
					className={cn(
						'text-label-sm rounded-full border px-3.5 py-1 font-medium',
						isDark
							? 'text-background border-background/20'
							: 'text-brand-dark border-brand-dark',
					)}
				>
					{audience}
				</span>
			</div>
			<div
				className={cn(
					'mb-6 h-px',
					isDark ? 'bg-background/15' : 'bg-brand-dark/15',
				)}
			/>
			<ul className="mb-8 flex flex-col gap-5">
				{steps.map(step => (
					<li key={step.number} className="flex gap-4">
						<span
							className={cn(
								'text-label-sm shrink-0 pt-0.5 font-bold tracking-wider',
								isDark ? 'text-brand-mint' : 'text-status-live',
							)}
						>
							{step.number}
						</span>
						<div>
							<div className="text-body-sm mb-1 font-bold">{step.title}</div>
							<div
								className={cn(
									'text-body-sm',
									isDark ? 'text-background/55' : 'text-ink-500',
								)}
							>
								{step.description}
							</div>
						</div>
					</li>
				))}
			</ul>
			{cta}
		</div>
	);
}
