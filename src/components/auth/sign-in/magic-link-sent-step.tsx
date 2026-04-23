'use client';

import { useState, type ComponentProps } from 'react';

import { LogoIcon } from '@/assets/logo-icon';
import { SIGN_IN_CARD_CLASS } from '@/components/auth/sign-in/constants';
import { buildOAuthCallbackUrl } from '@/lib/auth/build-oauth-callback-url';
import { cn } from '@/lib/class-names';
import { sendMagicLink } from '@/services/auth/magic-link';

export interface MagicLinkSentStepProps extends ComponentProps<'div'> {
	email: string;
	returnTo: string;
	onBack: () => void;
}

export function MagicLinkSentStep({
	className,
	email,
	returnTo,
	onBack,
	...props
}: MagicLinkSentStepProps) {
	const [isResending, setIsResending] = useState(false);
	const [resendStatus, setResendStatus] = useState<'idle' | 'sent' | 'error'>(
		'idle',
	);

	/** Resends the magic link to the same email address */
	async function handleResend() {
		setIsResending(true);
		setResendStatus('idle');

		const callbackURL = buildOAuthCallbackUrl(window.location.origin, returnTo);
		const result = await sendMagicLink(email, callbackURL);

		setIsResending(false);
		setResendStatus(result.success ? 'sent' : 'error');
	}

	/** Maps resend state to button label — extracted to avoid nested ternary in JSX */
	function getResendLabel(): string {
		if (isResending) return 'Sending...';

		switch (resendStatus) {
			case 'sent':
				return 'Link resent!';
			case 'error':
				return 'Failed to resend. Try again';
			case 'idle':
				return "Didn't get the email? Resend";
		}
	}

	return (
		<div className={cn(SIGN_IN_CARD_CLASS, className)} {...props}>
			<div className="mx-auto flex h-fit w-full max-w-80 flex-col items-center gap-4">
				<LogoIcon className="mx-auto" />

				<div className="my-6 flex flex-col items-center gap-1 text-center">
					<h1 className="font-clash-display line text-4xl font-semibold">
						Check your email
					</h1>
					<p className="text-muted-foreground">
						We sent a sign-in link to{' '}
						<span className="font-medium text-black">{email}</span>
					</p>
				</div>

				<p className="text-muted-foreground text-sm">
					Click the link in the email to sign in. You can close this tab.
				</p>

				<div className="mt-2 flex flex-col items-center gap-1">
					<button
						type="button"
						onClick={handleResend}
						disabled={isResending}
						className="text-muted-foreground text-sm underline-offset-4 hover:underline"
					>
						{getResendLabel()}
					</button>
					<button
						type="button"
						onClick={onBack}
						className="text-sm text-black underline-offset-4 hover:underline"
					>
						Use a different email
					</button>
				</div>
			</div>
		</div>
	);
}
