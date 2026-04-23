'use client';

import { Loader2Icon } from 'lucide-react';
import Link from 'next/link';

import {
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';

/** Spinner + "verifying..." copy shown while the modal polls the server. */
export function PaymentStatusLoading() {
	return (
		<DialogHeader className="z-1 flex flex-col items-center justify-center gap-2">
			<Loader2Icon className="size-12 animate-spin text-gray-400" />
			<DialogTitle className="font-clash-display text-2xl">
				Verifying payment...
			</DialogTitle>
			<DialogDescription className="text-center text-black">
				Please wait while we confirm your payment.
			</DialogDescription>
		</DialogHeader>
	);
}

interface PaymentStatusUnpaidProps {
	isParticipant: boolean;
}

/**
 * Unpaid terminal screen — the server saw the session but Stripe hasn't
 * yet reported success. Offers participants a path into their
 * sweepstakes so they aren't stuck in the modal.
 */
export function PaymentStatusUnpaid({
	isParticipant,
}: PaymentStatusUnpaidProps) {
	return (
		<DialogHeader className="z-1 flex flex-col items-center justify-center gap-2">
			<DialogTitle className="font-clash-display text-2xl">
				Payment processing
			</DialogTitle>
			<DialogDescription className="text-center text-black">
				Your payment is still being processed by Stripe.
				<br />
				This usually takes a few seconds. Please check back shortly.
			</DialogDescription>
			{isParticipant ? (
				<div className="my-6">
					<Link
						href="/my-raffles"
						className="rounded-full border border-black px-12 py-3 text-sm font-semibold"
					>
						View My Sweepstakes
					</Link>
				</div>
			) : null}
		</DialogHeader>
	);
}

/** Expired session screen — no payment was taken; user must restart. */
export function PaymentStatusExpired() {
	return (
		<DialogHeader className="z-1 flex flex-col items-center justify-center gap-2">
			<DialogTitle className="font-clash-display text-2xl">
				Payment expired
			</DialogTitle>
			<DialogDescription className="text-center text-black">
				Your checkout session has expired. No payment was taken.
				<br />
				Please try again to enter.
			</DialogDescription>
		</DialogHeader>
	);
}
