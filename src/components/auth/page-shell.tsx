import type { ComponentProps, ReactNode } from 'react';

/**
 * Shared auth page shell — split layout with decorative SVGs on the left
 * and a centered content slot on the right.
 *
 * Used by: sign-in, sign-up, forgot-password, reset-password, resend-verification.
 * NOT used by: verify-email (minimal centered layout without the split shell).
 *
 * Server Component — purely presentational, no data fetching.
 * Children (form components) are Client Components that cross the boundary here.
 *
 * @returns Split-pane layout with branded left panel and content slot on right
 */
export function AuthPageShell({ children }: { children: ReactNode }) {
	return (
		<div className="bg-background relative grid min-h-svh overflow-hidden lg:grid-cols-2">
			<ColoredCards className="absolute z-0 origin-top-left scale-75 max-lg:scale-50" />

			<div className="relative z-1 hidden flex-col justify-end pb-16 pl-20 lg:flex">
				<TicketIcon className="mb-8 size-20" />
				<hgroup className="font-clash-display text-80/none tracking-caps-1 font-semibold">
					<h1>Sweepstakes!</h1>
					<h1>Reimagined</h1>
					<h1>for trust -</h1>
					<h1>not guesswork!</h1>
				</hgroup>
			</div>
			<div className="z-1 flex flex-col p-6 md:p-10">
				<div className="flex flex-1 items-center justify-center">
					{children}
				</div>
			</div>
		</div>
	);
}

/** Decorative colored card shapes for the left panel background */
function ColoredCards(props: ComponentProps<'svg'>) {
	return (
		<svg
			width="880"
			height="561"
			viewBox="0 0 880 561"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M-214.831 -70.082C-211.4 -82.8851 -198.24 -90.4831 -185.437 -87.0525L288.373 39.9047C301.177 43.3353 308.775 56.4954 305.344 69.2986L178.387 543.109C174.956 555.912 161.796 563.51 148.993 560.08L-324.818 433.123C-337.621 429.692 -345.219 416.532 -341.788 403.729L-214.831 -70.082Z"
				fill="#C4EDFF"
			/>
			<path
				d="M58.0233 -360.816C63.7297 -372.78 78.0541 -377.852 90.0177 -372.146L653.657 -103.298C665.62 -97.5919 670.693 -83.2675 664.986 -71.304L396.139 492.335C390.432 504.299 376.108 509.371 364.144 503.664L-199.494 234.817C-211.458 229.111 -216.53 214.786 -210.824 202.823L58.0233 -360.816Z"
				fill="#BEFFDB"
			/>
			<path
				d="M164.362 -170.953C157.734 -182.432 161.667 -197.11 173.146 -203.738L597.953 -449C609.432 -455.628 624.11 -451.695 630.738 -440.216L876 -15.4086C882.628 -3.9296 878.695 10.7486 867.216 17.376L442.409 262.638C430.93 269.266 416.251 265.333 409.624 253.854L164.362 -170.953Z"
				fill="#F6FF8B"
			/>
		</svg>
	);
}

/** Ticket icon shown above the headline on the left panel */
function TicketIcon(props: ComponentProps<'svg'>) {
	return (
		<svg
			width="104"
			height="74"
			viewBox="0 0 104 74"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M100.286 25.9C102.337 25.9 104 24.2435 104 22.2V7.4C104 3.31311 100.674 0 96.5714 0H7.42857C3.3259 0 0 3.31311 0 7.4V22.2C0 24.2435 1.66289 25.9001 3.71429 25.9C12.292 25.9004 17.6533 35.1506 13.364 42.5504C11.3736 45.9844 7.69487 48.0998 3.71429 48.1C1.66293 48.1 0 49.7565 0 51.8V66.6C0 70.6871 3.32574 74.0002 7.42857 74H96.5714C100.674 74.0002 104 70.6871 104 66.6V51.8C104 49.7565 102.337 48.1 100.286 48.1C91.708 48.0996 86.3467 38.8494 90.6359 31.4496C92.6264 28.0156 96.3051 25.9002 100.286 25.9ZM7.42857 55.13C21.4389 52.296 27.1157 35.4164 17.6467 24.7468C14.9725 21.7335 11.3854 19.6704 7.42857 18.87V7.4H33.4286V66.6H7.42857V55.13ZM96.5714 55.13V66.6H40.8571V7.4H96.5714V18.87C82.5611 21.704 76.8843 38.5836 86.3533 49.2532C89.0275 52.2666 92.6146 54.3296 96.5714 55.13Z"
				fill="black"
			/>
		</svg>
	);
}
