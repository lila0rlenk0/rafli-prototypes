'use client';

import { Logo } from '@/assets/logo';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { ComponentProps, useState } from 'react';

const FEEDBACK_FORM_URL = 'https://forms.gle/pE38Fv2JxfSuPZjK6';

interface NavbarProps {
	showDecoration?: boolean;
}

/**
 * Navigation bar component for the landing page
 * @param props - Component props
 * @param props.showDecoration - Whether to show decorative colored cards (default: true)
 */
export function Navbar({ showDecoration = true }: NavbarProps) {
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	/**
	 * Toggles the mobile menu open/closed state
	 */
	function toggleMenu() {
		setIsMenuOpen(prev => !prev);
	}

	/**
	 * Closes the mobile menu
	 */
	function closeMenu() {
		setIsMenuOpen(false);
	}

	return (
		<>
			<nav className="relative w-full border-b border-black">
				{showDecoration && (
					<ColoredCard className="absolute top-0 right-0 z-0 origin-top-right scale-[.55] md:scale-[.85]" />
				)}

				<div className="relative z-10 mx-auto flex max-w-[1720px] items-center justify-between px-6 py-4 lg:px-[100px] lg:py-5">
					<div className="flex items-center gap-8 lg:gap-[60px]">
						<Link href="/" aria-label="Home">
							<Logo className="h-5 w-auto" />
						</Link>
						<div className="hidden items-center gap-8 text-base font-bold md:flex">
							<Link
								href="#participants"
								className="text-black hover:opacity-80"
							>
								For Participants
							</Link>
							<Link href="#hosts" className="text-[#121211] hover:opacity-80">
								For Hosts
							</Link>
						</div>
					</div>

					{/* Desktop: Right side buttons */}
					<div className="hidden items-center gap-4 md:flex">
						<a
							href={FEEDBACK_FORM_URL}
							target="_blank"
							rel="noopener noreferrer"
							className="flex h-[38px] items-center rounded-full border border-black px-4 text-sm font-medium text-black"
						>
							Help us improve
						</a>
						<Button
							asChild
							className="h-[38px] bg-black px-6 text-sm text-white hover:bg-black/90"
						>
							<Link href="/sign-in">Enter the App</Link>
						</Button>
					</div>

					{/* Mobile: Hamburger menu button */}
					<button
						onClick={toggleMenu}
						className="flex size-10 items-center justify-center md:hidden"
						aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
						aria-expanded={isMenuOpen}
					>
						{isMenuOpen ? (
							<X className="size-6" />
						) : (
							<Menu className="size-6" />
						)}
					</button>
				</div>
			</nav>

			{/* Mobile menu overlay */}
			{isMenuOpen && (
				<div className="fixed inset-0 z-50 bg-[#f9f8f4] md:hidden">
					<div className="flex items-center justify-between px-6 py-4">
						<Link href="/" aria-label="Home" onClick={closeMenu}>
							<Logo className="h-5 w-auto" />
						</Link>
						<button
							onClick={closeMenu}
							className="flex size-10 items-center justify-center"
							aria-label="Close menu"
						>
							<X className="size-6" />
						</button>
					</div>

					<div className="flex flex-col gap-6 px-6 pt-8">
						<Link
							href="#participants"
							className="text-xl font-bold text-black"
							onClick={closeMenu}
						>
							For Participants
						</Link>
						<Link
							href="#hosts"
							className="text-xl font-bold text-black"
							onClick={closeMenu}
						>
							For Hosts
						</Link>
						<Button
							asChild
							className="mt-4 h-[38px] bg-black text-sm text-white hover:bg-black/90"
						>
							<Link href="/sign-in" onClick={closeMenu}>
								Enter the App
							</Link>
						</Button>
						<a
							href={FEEDBACK_FORM_URL}
							target="_blank"
							rel="noopener noreferrer"
							onClick={closeMenu}
							className="flex h-[38px] items-center justify-center rounded-full border border-black px-4 text-sm font-medium text-black"
						>
							Help us improve
						</a>
					</div>
				</div>
			)}
		</>
	);
}

function ColoredCard(props: ComponentProps<'svg'>) {
	return (
		<svg
			width="854"
			height="818"
			viewBox="0 0 854 818"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M1062.61 217.182C1059.18 204.379 1046.02 196.781 1033.22 200.212L583.396 320.74C570.593 324.171 562.995 337.331 566.426 350.134L686.954 799.953C690.385 812.756 703.545 820.354 716.348 816.924L1166.17 696.395C1178.97 692.964 1186.57 679.804 1183.14 667.001L1062.61 217.182Z"
				fill="#C4EDFF"
			/>
			<path
				d="M821.515 -112.338C815.809 -124.302 801.484 -129.374 789.521 -123.668L253.876 131.827C241.913 137.533 236.84 151.858 242.547 163.821L498.041 699.465C503.747 711.429 518.072 716.501 530.035 710.795L1065.68 455.301C1077.64 449.594 1082.72 435.27 1077.01 423.306L821.515 -112.338Z"
				fill="#BEFFDB"
			/>
			<path
				d="M680.929 -50.3721C687.556 -61.8511 683.623 -76.5293 672.144 -83.1567L268.847 -316C257.368 -322.628 242.69 -318.695 236.063 -307.216L3.21946 96.0811C-3.40795 107.56 0.525059 122.238 12.0041 128.866L415.301 361.709C426.78 368.337 441.458 364.403 448.085 352.924L680.929 -50.3721Z"
				fill="#F6FF8B"
			/>
		</svg>
	);
}
