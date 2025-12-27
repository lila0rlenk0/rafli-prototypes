import { Button } from '@/components/ui/button';
import { Copy, X } from 'lucide-react';
import Link from 'next/link';

const LEFT_PANEL_LINKS = [
	{
		label: 'Legal Stuff',
		href: '/blog/legal-stuff',
	},
	{
		label: 'How to host a Raffle',
		href: '/blog/how-to-host-a-raffle',
	},
	{
		label: 'Minimum Target',
		href: '/blog/minimum-target',
	},
	{
		label: 'Promo tips',
		href: '/blog/promo-tips',
	},
	{
		label: 'Ticket Bundles',
		href: '/blog/ticket-bundles',
	},
];

export default function RafflesCreatePage() {
	return (
		<div className="flex w-full gap-4">
			<div className="flex min-w-fit flex-col space-y-8 rounded-2xl bg-white px-6 py-12">
				<div className="flex h-24 w-fit items-center justify-center rounded-2xl bg-[#B9AF86] px-8">
					<strong className="font-bold uppercase">icon tbc</strong>
				</div>

				<span className="mr-12 text-xl font-semibold">
					How to build the best Raffle?
				</span>

				{LEFT_PANEL_LINKS.map(item => (
					<Link
						key={item.href}
						href={item.href}
						className="flex w-fit items-center gap-4"
					>
						<Copy className="size-6" />
						<span className="text-[#6E6E6E]">{item.label}</span>
					</Link>
				))}
			</div>

			<div className="flex w-full flex-col space-y-6">
				<div className="flex w-full items-center justify-between">
					<h1 className="text-4xl font-semibold">Create Raffle</h1>
					<div className="flex items-center gap-2">
						<Button variant="outline" disabled>
							Preview Page
						</Button>

						<X className="size-5" />
					</div>
				</div>

				<div className="relative h-3 w-full">
					<div className="absolute h-3 w-full rounded-full bg-[#EEEEEE]" />
					<div className="bg-green absolute h-3 w-[calc(30%)] rounded-full" />
				</div>

				<div className="w-full rounded-2xl bg-white p-8">
					<h2 className="text-xl font-semibold">Lets add Basics</h2>
				</div>
			</div>
		</div>
	);
}
