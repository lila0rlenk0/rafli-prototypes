import { Copy } from 'lucide-react';
import Link from 'next/link';

import { FormHeader } from './form-header';
import { FormStepComponent } from './form-step-component';
import { MultiStepFormProvider } from './multi-step-form-provider';

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
			<div className="flex h-fit min-w-fit flex-col space-y-8 rounded-2xl bg-white px-6 py-12">
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

			<MultiStepFormProvider>
				<div className="flex w-full max-w-[815px] flex-col">
					<FormHeader />
					<FormStepComponent />
				</div>
			</MultiStepFormProvider>
		</div>
	);
}
