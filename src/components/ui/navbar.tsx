import { Logo } from '@/assets/logo';
import { ModeSwitchButton } from '@/components/mode/mode-switch-button';
import { User } from 'lucide-react';
import Link from 'next/link';
import { ReactNode } from 'react';

interface NavbarProps {
	children: ReactNode;
}

export function Navbar({ children }: NavbarProps) {
	return (
		<div className="z-10 mx-auto flex w-full max-w-[1300px] flex-col">
			<div className="z-10 flex h-16 items-center justify-between px-6">
				<div className="flex items-center gap-8">
					<Link href="/browse">
						<Logo />
					</Link>

					<div className="h-8 w-px bg-[#E6E8EC]" />

					<Link href="/browse" className="text-sm font-semibold">
						Browse
					</Link>

					<Link href="/my-raffles" className="text-sm font-semibold">
						My Raffles
					</Link>
				</div>
				<div className="flex items-center gap-8">
					<ModeSwitchButton />

					<Link href="/profile">
						<User className="size-5" />
					</Link>
				</div>
			</div>

			<div className="mt-10 max-w-[1400px] overflow-auto pb-10">{children}</div>
		</div>
	);
}
