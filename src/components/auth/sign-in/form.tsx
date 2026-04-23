'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo, useState, type ComponentProps } from 'react';

import { MagicLinkEmailStep } from '@/components/auth/sign-in/magic-link-email-step';
import { MagicLinkSentStep } from '@/components/auth/sign-in/magic-link-sent-step';
import { PasswordSignInForm } from '@/components/auth/sign-in/password-form';
import { getSignInErrorMessage } from '@/components/auth/sign-in/error-messages';
import { buildOAuthCallbackUrl } from '@/lib/auth/build-oauth-callback-url';
import { validateReturnTo } from '@/lib/utils/routing/validate-return-to';
import { initiateSocialSignIn } from '@/services/auth/social-sign-in';

/** Tracks which sign-in UI step is currently visible */
type SignInMode = 'password' | 'magic-link-email' | 'magic-link-sent';

/**
 * Root sign-in form orchestrator — manages mode switching between magic link,
 * password, and "link sent" confirmation steps.
 *
 * 'use client' required: uses useSearchParams, useState, useMemo, router via children.
 * Google OAuth handler is lifted here to share across both input modes.
 *
 * @returns The currently active sign-in step component
 */
export function SignInForm({ className, ...props }: ComponentProps<'form'>) {
	const [mode, setMode] = useState<SignInMode>('magic-link-email');
	const [magicLinkEmail, setMagicLinkEmail] = useState('');
	const [isSocialPending, setIsSocialPending] = useState(false);
	const [socialError, setSocialError] = useState<string | null>(null);
	const searchParams = useSearchParams();
	const returnTo = useMemo(
		() => validateReturnTo(searchParams.get('returnTo')),
		[searchParams],
	);

	/**
	 * Shared across both sign-in modes — lifted here to avoid duplication.
	 * Initiates Google OAuth flow via server action and redirects to Google's consent screen.
	 */
	async function handleGoogleSignIn() {
		setIsSocialPending(true);
		setSocialError(null);

		const result = await initiateSocialSignIn({
			provider: 'google',
			callbackURL: buildOAuthCallbackUrl(window.location.origin, returnTo),
		});

		if (!result.success) {
			setSocialError(getSignInErrorMessage(result.error));
			setIsSocialPending(false);
			return;
		}

		window.location.href = result.data.url;
	}

	function handleMagicLinkSent(email: string) {
		setMagicLinkEmail(email);
		setMode('magic-link-sent');
	}

	function handleSwitchToPassword() {
		setMode('password');
		setSocialError(null);
	}

	function handleSwitchToMagicLink() {
		setMode('magic-link-email');
		setMagicLinkEmail('');
		setSocialError(null);
	}

	function handleBackToMagicLink() {
		setMode('magic-link-email');
		setMagicLinkEmail('');
	}

	if (mode === 'magic-link-email') {
		return (
			<MagicLinkEmailStep
				className={className}
				returnTo={returnTo}
				onLinkSent={handleMagicLinkSent}
				onSwitchToPassword={handleSwitchToPassword}
				onGoogleSignIn={handleGoogleSignIn}
				isSocialPending={isSocialPending}
				socialError={socialError}
				{...props}
			/>
		);
	}

	if (mode === 'password') {
		return (
			<PasswordSignInForm
				className={className}
				returnTo={returnTo}
				onSwitchToMagicLink={handleSwitchToMagicLink}
				onGoogleSignIn={handleGoogleSignIn}
				isSocialPending={isSocialPending}
				socialError={socialError}
				{...props}
			/>
		);
	}

	return (
		<MagicLinkSentStep
			className={className}
			email={magicLinkEmail}
			returnTo={returnTo}
			onBack={handleBackToMagicLink}
		/>
	);
}
