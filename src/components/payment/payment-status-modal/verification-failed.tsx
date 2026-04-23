'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import type { getStripeVerificationFailureCopy } from './state';

type VerificationFailureCopy = ReturnType<
	typeof getStripeVerificationFailureCopy
>;

interface PaymentStatusVerificationFailedProps {
	copy: VerificationFailureCopy;
	signInHref: string;
	isParticipant: boolean;
	onClose: () => void;
	onRetry: () => void;
}

/**
 * Verification-failed screen — shown when the poll loop exhausts its
 * budget without observing a paid state or when the server returns a
 * hard error. Exposes close / retry / sign-in CTAs depending on the
 * classifier's copy metadata so the user always has a clear next step.
 */
export function PaymentStatusVerificationFailed({
	copy,
	signInHref,
	isParticipant,
	onClose,
	onRetry,
}: PaymentStatusVerificationFailedProps) {
	const showSignIn = copy.requiresSignIn;
	const showRetry = !showSignIn && copy.canRetry;

	return (
		<DialogHeader className="z-1 flex flex-col items-center justify-center gap-2">
			<DialogTitle className="font-clash-display text-2xl">
				{copy.title}
			</DialogTitle>
			<DialogDescription className="text-center text-black">
				{copy.description}
			</DialogDescription>
			<div className="my-6 flex w-full flex-col gap-2 sm:flex-row">
				<Button
					type="button"
					variant="outline"
					onClick={onClose}
					className="h-12 flex-1 border-2 border-black bg-white text-black hover:bg-black hover:text-white"
				>
					Close
				</Button>
				{showSignIn ? (
					<Button
						asChild
						className="h-12 flex-1 border-2 border-black bg-black hover:bg-white hover:text-black"
					>
						<Link href={signInHref}>Sign in to verify</Link>
					</Button>
				) : null}
				{showRetry ? (
					<Button
						type="button"
						onClick={onRetry}
						className="h-12 flex-1 border-2 border-black bg-black hover:bg-white hover:text-black"
					>
						Retry verification
					</Button>
				) : null}
			</div>
			{isParticipant ? (
				<Button
					asChild
					variant="outline"
					className="h-12 w-full border-2 border-black bg-white text-black hover:bg-black hover:text-white"
				>
					<Link href="/my-raffles">View My Sweepstakes</Link>
				</Button>
			) : null}
		</DialogHeader>
	);
}
