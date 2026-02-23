import { Button } from '@/components/ui/button';
import { CheckIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ComponentProps } from 'react';

// GSAP-dependent — dynamic import avoids loading the full GSAP bundle upfront
const SplitText = dynamic(
	() => import('@/components/ui/animations/split-text'),
	{ ssr: false },
);

/**
 * Section for participants with benefits list
 */
export function ParticipantSection() {
	const benefits = [
		'Raffles hosted by verified creators',
		'Winners selected using verifiable randomness',
		'Prize details visible before entry',
		'Track progress from start to finish',
		'Transparent rules for every raffle',
	];

	return (
		<section
			id="participants"
			className="mx-auto max-w-[1720px] px-6 py-10 lg:px-[108px] lg:py-20"
		>
			{/* Wrapper to allow decorative elements to overflow */}
			<div className="relative">
				{/* Decorative background shapes - positioned outside the card */}
				<div className="pointer-events-none absolute bottom-32 -left-10 z-10 hidden lg:block">
					<div className="relative h-[600px] w-[500px]">
						<div className="absolute top-[100px] left-0 h-[532px] w-[532px] rotate-[-27.845deg] rounded-3xl bg-[#9ffbc8]" />
						<div className="absolute top-0 left-[50px] h-[600px] w-[600px] rotate-[-15.483deg] rounded-3xl bg-[#beffdb]">
							<div className="flex h-full w-full items-center justify-center">
								<TadaIcon />
							</div>
						</div>
					</div>
				</div>

				{/* Main card container */}
				<div className="bg-background relative rounded-[60px] border-2 border-black px-8 py-12 lg:rounded-[120px] lg:px-20 lg:py-24">
					{/* Grid layout: left side decorative, right side content */}
					<div className="grid lg:grid-cols-2">
						{/* Left side - Diamond icon (visible on mobile, hidden positioning on desktop) */}
						<div className="relative hidden lg:flex lg:items-end lg:justify-start">
							<div className="absolute bottom-0 left-0">
								<DiamondIcon />
							</div>
						</div>

						{/* Right side - Content */}
						<div className="relative">
							<p className="mb-4 text-lg font-bold text-black lg:text-2xl">
								WANT TO PARTICIPATE?
							</p>
							<SplitText
								text="Join Raffles With Full Confidence"
								className="font-clash-display text-dark mb-10 text-4xl leading-none font-semibold tracking-[0.8px] lg:text-[72px]"
								delay={50}
								duration={1.25}
								ease="power3.out"
								splitType="chars"
								from={{ opacity: 0, y: 40 }}
								to={{ opacity: 1, y: 0 }}
								threshold={0.1}
								textAlign="left"
							/>
							<ul className="mb-10 space-y-4">
								{benefits.map(benefit => (
									<li
										key={benefit}
										className="flex items-center gap-3 text-lg font-medium text-black lg:text-2xl"
									>
										<CheckmarkIcon />
										<span>{benefit}</span>
									</li>
								))}
							</ul>
							<Button
								asChild
								className="text-background hover:bg-background h-[60px] w-full border-2 border-black bg-black text-lg hover:text-black sm:w-[234px]"
							>
								<Link href="/browse">Explore raffles</Link>
							</Button>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

function TadaIcon(props: ComponentProps<'svg'>) {
	return (
		<svg
			width="201"
			height="201"
			viewBox="0 0 201 201"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M73.9379 41.5307C72.189 39.7868 70.029 38.5114 67.6571 37.8222C65.2852 37.133 62.7778 37.0522 60.3664 37.5872C57.955 38.1222 55.7173 39.2558 53.8596 40.8834C52.002 42.5111 50.5844 44.5802 49.7375 46.9L0.880586 181.254C0.0779835 183.469 -0.181268 185.845 0.124595 188.181C0.430458 190.518 1.29251 192.747 2.63838 194.681C3.98426 196.616 5.77468 198.199 7.85934 199.299C9.94401 200.398 12.2621 200.982 14.619 201C16.3543 200.988 18.0742 200.673 19.7011 200.069L154.079 151.215C156.4 150.37 158.47 148.953 160.099 147.096C161.728 145.24 162.863 143.003 163.399 140.592C163.935 138.181 163.855 135.674 163.167 133.302C162.478 130.93 161.203 128.77 159.459 127.021L73.9379 41.5307ZM66.1845 167.351L33.607 134.782L45.8561 101.086L99.8882 155.105L66.1845 167.351ZM14.9913 185.962L28.0223 150.22L50.78 172.972L14.9913 185.962ZM115.367 149.484L51.4781 85.6111L63.5783 52.2321L148.68 137.313L115.367 149.484ZM119.09 59.5556C119.23 54.5228 120.449 49.5788 122.665 45.0575C127.598 35.2029 136.906 29.7778 148.875 29.7778C155.112 29.7778 159.114 27.6468 161.581 23.0685C162.88 20.5071 163.625 17.7012 163.768 14.8331C163.775 12.8587 164.567 10.9681 165.969 9.57722C166.663 8.88853 167.486 8.34325 168.391 7.97252C169.295 7.60179 170.264 7.41286 171.242 7.41653C172.22 7.42019 173.188 7.61638 174.09 7.99389C174.992 8.37139 175.811 8.92282 176.499 9.6167C177.188 10.3106 177.734 11.1333 178.105 12.0379C178.475 12.9425 178.664 13.9113 178.661 14.8889C178.661 26.8558 170.73 44.6667 148.875 44.6667C142.639 44.6667 138.637 46.7976 136.17 51.376C134.871 53.9374 134.126 56.7433 133.983 59.6114C133.979 60.589 133.783 61.5563 133.405 62.4581C133.028 63.3599 132.476 64.1785 131.782 64.8672C131.088 65.5559 130.265 66.1012 129.36 66.4719C128.456 66.8427 127.487 67.0316 126.509 67.0279C125.531 67.0243 124.563 66.8281 123.661 66.4506C122.759 66.0731 121.94 65.5216 121.252 64.8278C120.563 64.1339 120.017 63.3112 119.646 62.4065C119.276 61.5019 119.087 60.5332 119.09 59.5556ZM96.7515 29.7778L96.7515 7.44445C96.7515 5.47006 97.536 3.57653 98.9325 2.18043C100.329 0.784324 102.223 7.1258e-07 104.198 6.98333e-07C106.173 6.84086e-07 108.067 0.784324 109.463 2.18043C110.86 3.57653 111.644 5.47006 111.644 7.44445L111.644 29.7778C111.644 31.7522 110.86 33.6457 109.463 35.0418C108.067 36.4379 106.173 37.2222 104.198 37.2222C102.223 37.2222 100.329 36.4379 98.9325 35.0418C97.536 33.6457 96.7515 31.7522 96.7515 29.7778ZM191.375 106.4C192.771 107.797 193.555 109.691 193.554 111.665C193.553 113.64 192.768 115.533 191.37 116.929C189.973 118.325 188.079 119.108 186.104 119.107C184.129 119.106 182.235 118.321 180.839 116.924L165.946 102.035C164.549 100.639 163.764 98.744 163.764 96.7685C163.764 94.793 164.549 92.8984 165.946 91.5015C167.343 90.1046 169.238 89.3199 171.214 89.3199C173.19 89.3199 175.085 90.1046 176.483 91.5015L191.375 106.4ZM195.908 66.6185L173.569 74.0629C171.696 74.6873 169.651 74.542 167.884 73.659C166.118 72.776 164.774 71.2275 164.15 69.3543C163.525 67.4811 163.67 65.4366 164.554 63.6705C165.437 61.9044 166.986 60.5615 168.859 59.9371L191.198 52.4926C193.072 51.8682 195.117 52.0135 196.883 52.8966C198.65 53.7796 199.993 55.3281 200.618 57.2013C201.242 59.0745 201.097 61.119 200.214 62.8851C199.331 64.6511 197.782 65.9941 195.908 66.6185Z"
				fill="black"
			/>
		</svg>
	);
}

/**
 * Decorative diamond icon for participant section
 */
function DiamondIcon() {
	return (
		<svg
			width="201"
			height="201"
			viewBox="0 0 201 201"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className="h-32 w-32 lg:h-[201px] lg:w-[201px]"
		>
			<path
				d="M100.5 0L150.75 50.25L100.5 100.5L50.25 50.25L100.5 0Z"
				fill="black"
			/>
			<path
				d="M100.5 100.5L150.75 150.75L100.5 201L50.25 150.75L100.5 100.5Z"
				fill="black"
			/>
			<path
				d="M0 100.5L50.25 50.25L100.5 100.5L50.25 150.75L0 100.5Z"
				fill="black"
			/>
			<path
				d="M100.5 100.5L150.75 50.25L201 100.5L150.75 150.75L100.5 100.5Z"
				fill="black"
			/>
		</svg>
	);
}

/**
 * Checkmark icon for feature lists
 */
function CheckmarkIcon() {
	return (
		<div className="flex h-6 w-6 shrink-0 items-center justify-center">
			<CheckIcon className="h-5 w-5 text-black" strokeWidth={3} />
		</div>
	);
}
