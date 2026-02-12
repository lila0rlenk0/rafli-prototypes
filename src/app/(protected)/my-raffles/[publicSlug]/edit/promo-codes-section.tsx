'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

import { useEditForm } from './edit-form-provider';

/**
 * Promo codes section for the raffle edit tickets step
 * Shows a link to the full promo codes management page
 */
export function PromoCodesSection() {
	const { originalRaffle } = useEditForm();

	return (
		<div className="flex flex-col gap-4 rounded-2xl bg-white p-6">
			<div className="flex flex-col gap-2">
				<h2 className="text-xl font-semibold">
					Invite more people with promo codes
				</h2>
				<p className="text-sm text-gray-600">
					Create promotional codes for discounts or free tickets to boost
					participation in your raffle.
				</p>
			</div>

			<div>
				<Button
					type="button"
					className="font-clash-display cursor-pointer border-2 border-black bg-white px-8 font-semibold text-black hover:bg-black hover:text-white"
					asChild
				>
					<Link
						href={`/my-raffles/${originalRaffle.publicSlugOrCode}/promo-codes`}
					>
						See promo codes
						<ArrowRight className="size-4" />
					</Link>
				</Button>
			</div>
		</div>
	);
}
