import { Logo } from '@/assets/logo';
import { Bell, User } from 'lucide-react';
import Link from 'next/link';
import { ReactNode } from 'react';

interface NavbarProps {
	children: ReactNode;
}

export function Navbar({ children }: NavbarProps) {
	return (
		<div className="mx-auto w-full max-w-[1300px]">
			<div className="flex h-16 items-center justify-between px-6">
				<div className="flex items-center gap-8">
					<Link href="/browse" className="mr-12">
						<Logo />
					</Link>

					<Link href="/browse" className="text-sm font-semibold">
						Browse
					</Link>

					<Link href="/my-raffles" className="text-sm font-semibold">
						My Raffles (2)
					</Link>
				</div>
				<div className="flex items-center gap-8">
					<Bell className="size-5" />

					<Link href="/profile">
						<User className="size-5" />
					</Link>
				</div>
			</div>

			<div className="mx-auto mt-10 max-w-[1200px] overflow-auto pb-10">
				{children}
			</div>
		</div>
	);
}
