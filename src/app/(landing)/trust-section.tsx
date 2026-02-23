import { TicketIcon } from '@/assets/ticket-icon';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import dynamic from 'next/dynamic';

// GSAP-dependent — dynamic import avoids loading the full GSAP bundle upfront
const SplitText = dynamic(
	() => import('@/components/ui/animations/split-text'),
	{ ssr: false },
);

const steps = [
	{
		number: 1,
		text: 'Browse raffles or decide to host one',
		variant: 'green' as const,
	},
	{
		number: 2,
		text: 'Hosts complete a quick verification step',
		variant: 'green' as const,
	},
	{
		number: 3,
		text: 'Join or launch raffles with clear rules',
		variant: 'green' as const,
	},
	{
		number: 4,
		text: 'Winners are selected transparently',
		variant: 'green' as const,
	},
	{
		number: 5,
		text: 'Results are visible and trackable on-chain',
		variant: 'yellow' as const,
	},
] as const;

const cardTransforms = [
	'rotate-[1.5deg] -translate-x-2',
	'-rotate-[1.5deg] translate-x-4',
	'rotate-[2deg] -translate-x-1',
	'-rotate-[1.5deg] translate-x-6',
	'rotate-[1.5deg] translate-x-1',
] as const;

/**
 * Section explaining the platform's trust-focused approach
 */
export function TrustSection() {
	return (
		<section className="relative mt-20 bg-[#C4EDFF] px-6 py-20 lg:mt-0 lg:rounded-[120px] lg:px-[108px] lg:py-[150px]">
			<div className="relative mx-auto max-w-[1720px]">
				<div className="mb-16">
					<TicketIcon />
				</div>
				<div className="relative mb-8 max-w-[885px]">
					<div className="absolute top-8 -right-4 hidden h-[128px] w-[321px] -translate-y-1/2 rotate-2 rounded-[30px] bg-[#BEFFDB] lg:block" />
					<SplitText
						text="Reimagined for trust -"
						className="font-clash-display text-dark relative z-10 text-4xl leading-none font-semibold tracking-[0.8px] lg:text-[80px]"
						delay={50}
						duration={1.25}
						ease="power3.out"
						splitType="chars"
						from={{ opacity: 0, y: 40 }}
						to={{ opacity: 1, y: 0 }}
						threshold={0.1}
						rootMargin="-100px"
						textAlign="center"
					/>
					<SplitText
						text="not guesswork"
						className="font-clash-display text-dark relative z-10 text-4xl leading-none font-semibold tracking-[0.8px] lg:text-[80px]"
						delay={50}
						duration={1.25}
						ease="power3.out"
						splitType="chars"
						from={{ opacity: 0, y: 40 }}
						to={{ opacity: 1, y: 0 }}
						threshold={0.1}
						rootMargin="-100px"
						textAlign="center"
					/>
				</div>
				<p className="max-w-[1168px] text-lg leading-relaxed font-medium text-black lg:text-2xl">
					Traditional raffles often leave users wondering what&apos;s happening
					behind the scenes.
					<br />
					We built Rafli to make every step visible - from who&apos;s hosting
					the raffle to how winners are selected.
				</p>
			</div>

			<div className="relative mx-auto max-w-[1720px] px-6 py-20 lg:px-[108px] lg:py-[150px]">
				<h2 className="font-clash-display text-dark mb-12 text-center text-4xl leading-none font-semibold tracking-[0.6px] lg:mb-16 lg:text-[60px]">
					How would you like to participate?
				</h2>
				<div className="mx-auto flex max-w-[900px] flex-col gap-4">
					{steps.map((step, index) => {
						const bgColor =
							step.variant === 'yellow' ? 'bg-[#F6FF8B]' : 'bg-[#BEFFDB]';
						const transform = cardTransforms[index] ?? '';

						return (
							<motion.div
								key={step.number}
								className={`flex items-center gap-4 rounded-[30px] border-2 border-black ${bgColor} px-6 py-8 lg:px-8 ${transform}`}
								initial={{ opacity: 0, y: 40 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true, amount: 0.4 }}
								transition={{
									duration: 0.6,
									delay: index * 0.12,
									ease: 'easeOut',
								}}
							>
								<div className="flex h-[70px] w-[70px] shrink-0 items-center justify-center rounded-full border-2 border-black">
									<span className="font-clash-display text-3xl font-bold text-black">
										{step.number}
									</span>
								</div>
								<p className="text-xl font-medium text-black lg:text-[32px] lg:leading-none">
									{step.text}
								</p>
							</motion.div>
						);
					})}
				</div>
			</div>

			<div className="mx-auto max-w-[1720px] px-6 lg:px-[108px]">
				<div className="mb-4">
					<ShieldCheck className="size-16" />
				</div>
				<p className="max-w-[679px] text-lg leading-relaxed font-medium text-black lg:text-2xl">
					Every raffle follows clear rules and transparent draw mechanics,
					supported by blockchain technology!
				</p>
			</div>
		</section>
	);
}
