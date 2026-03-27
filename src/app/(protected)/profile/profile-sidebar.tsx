'use client';

import { ComponentProps } from 'react';

/**
 * Profile sidebar item configuration
 */
interface ProfileSidebarItem {
	label: string;
	sectionId: string;
}

/**
 * Props for the ProfileSidebar component
 */
interface ProfileSidebarProps {
	items: ProfileSidebarItem[];
}

/**
 * ProfileSidebar Component
 *
 * Displays a sidebar card with settings navigation.
 * Lists all profile sections with click-to-scroll behavior.
 *
 * @returns Sidebar with settings icon and section navigation
 */
export function ProfileSidebar({ items }: ProfileSidebarProps) {
	return (
		<div className="sticky top-8 hidden h-fit shrink-0 flex-col rounded-3xl border border-black bg-white/95 py-10 pr-10 pl-8 md:flex">
			<SettingsIcon className="size-15" />

			<div className="mt-6 flex flex-col gap-6">
				<span className="text-lg font-semibold text-black/95">Settings</span>

				<div className="flex flex-col gap-4">
					{items.map(function renderItem(item) {
						return (
							<button
								key={item.sectionId}
								type="button"
								onClick={() => {
									const element = document.getElementById(item.sectionId);
									if (element) {
										element.scrollIntoView({
											behavior: 'smooth',
											block: 'start',
										});
									}
								}}
								className="flex w-fit items-center gap-4 text-left transition-colors hover:text-black"
							>
								<SidebarItemIcon className="size-4 shrink-0" />
								<span className="text-sm leading-relaxed text-[#6E6E6E]">
									{item.label}
								</span>
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
}

/**
 * Settings gear icon SVG for the sidebar header
 *
 * @returns SVG icon matching the Figma design
 */
function SettingsIcon(props: ComponentProps<'svg'>) {
	return (
		<svg
			viewBox="0 0 100 102"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M98.072 20.7367L95.8344 19.4416C96.0969 18.0482 96.0969 16.6178 95.8344 15.2244L98.072 13.9294C100.634 12.4469 100.634 8.74022 98.0727 7.25726C96.884 6.569 95.4194 6.56883 94.2305 7.25682L91.9881 8.55668C90.9148 7.63357 89.6809 6.91709 88.3482 6.44322V3.85317C88.3452 0.888386 85.142 -0.961328 82.5825 0.523704C81.3971 1.21148 80.6666 2.48001 80.6652 3.85317V6.44322C79.3325 6.91709 78.0985 7.63357 77.0254 8.55668L74.7829 7.25682C72.2212 5.77443 69.0195 7.62812 69.0199 10.5935C69.02 11.9698 69.7525 13.2413 70.9414 13.9294L73.179 15.2244C72.9165 16.6178 72.9165 18.0482 73.179 19.4416L70.9414 20.7367C68.3797 22.2179 68.378 25.9239 70.9384 27.4075C71.5232 27.7463 72.1867 27.9246 72.8621 27.9243C73.5366 27.9264 74.1995 27.7486 74.7829 27.4092L77.0254 26.1093C78.0985 27.0324 79.3325 27.7489 80.6652 28.2228V30.8128C80.6682 33.7776 83.8714 35.6273 86.4309 34.1423C87.6163 33.4545 88.3468 32.186 88.3482 30.8128V28.2228C89.6809 27.7489 90.9148 27.0324 91.9881 26.1093L94.2305 27.4092C94.8139 27.7486 95.4768 27.9264 96.1513 27.9243C99.1085 27.9255 100.958 24.7167 99.4803 22.1485C99.1429 21.562 98.6571 21.075 98.072 20.7367ZM80.6652 17.333C80.6652 14.3682 83.8664 12.5152 86.4275 13.9976C88.9885 15.48 88.9885 19.186 86.4275 20.6684C85.8435 21.0064 85.181 21.1843 84.5067 21.1844C82.385 21.1845 80.6652 19.4601 80.6652 17.333ZM94.7587 40.4942C92.6663 40.8453 91.2539 42.8303 91.6039 44.9282C91.9939 47.2636 92.1899 49.6275 92.1897 51.9954C92.1988 62.3662 88.397 72.3769 81.5103 80.1153C77.2259 73.8909 71.2015 69.0754 64.1947 66.2744C78.1335 55.2676 74.9606 33.2604 58.4835 26.6614C42.0063 20.0624 24.5828 33.8209 27.1211 51.4267C27.9668 57.2921 31.0278 62.6075 35.6715 66.2744C28.6647 69.0754 22.6403 73.8909 18.3559 80.1153C-3.23536 55.7225 9.60846 17.0437 41.4748 10.4935C44.2581 9.92143 47.0919 9.63219 49.9331 9.63024C52.295 9.62988 54.6528 9.8263 56.9823 10.2176C59.9034 10.6795 62.2278 7.79788 61.1663 5.03067C60.6828 3.77036 59.5763 2.85595 58.25 2.62074C20.3683 -3.76842 -10.2065 33.3519 3.2154 69.4372C16.6373 105.523 63.9894 113.509 88.4492 83.8128C97.6667 72.6219 101.583 57.9694 99.1813 43.6572C98.8311 41.5594 96.8511 40.1434 94.7587 40.4942ZM34.5671 48.144C34.5671 36.2849 47.3721 28.8729 57.6161 34.8025C67.8601 40.732 67.8601 55.556 57.6161 61.4856C55.2804 62.8376 52.6302 63.5494 49.9331 63.5496C41.4464 63.55 34.5671 56.6525 34.5671 48.144ZM24.0413 85.4543C36.1276 66.5033 63.7386 66.5033 75.8249 85.4543C60.5955 97.3289 39.2707 97.3289 24.0413 85.4543Z"
				fill="black"
			/>
		</svg>
	);
}

/**
 * Small document icon used for sidebar navigation items
 *
 * @returns SVG icon matching the Figma design
 */
function SidebarItemIcon(props: ComponentProps<'svg'>) {
	return (
		<svg
			viewBox="0 0 16 16"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M13.3333 14H2.66667C2.29848 14 2 13.7015 2 13.3333V2.66667C2 2.29848 2.29848 2 2.66667 2H9.33333L14 6.66667V13.3333C14 13.7015 13.7015 14 13.3333 14Z"
				stroke="currentColor"
				strokeWidth="1.2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M9.33333 2V6.66667H14"
				stroke="currentColor"
				strokeWidth="1.2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
