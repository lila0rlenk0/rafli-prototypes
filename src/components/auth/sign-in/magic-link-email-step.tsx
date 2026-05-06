'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type ComponentProps } from 'react';
import { useForm } from 'react-hook-form';

import { LogoIcon } from '@/assets/logo-icon';
import { SIGN_IN_CARD_CLASS } from '@/components/auth/sign-in/constants';
import { getSignInErrorMessage } from '@/components/auth/sign-in/error-messages';
import { SignInFooter } from '@/components/auth/sign-in/footer';
import {
	magicLinkEmailFormSchema,
	type MagicLinkEmailFormValues,
} from '@/components/auth/sign-in/schema';
import {
	TurnstileWidget,
	type TurnstileWidgetHandle,
} from '@/components/auth/turnstile/turnstile-widget';
import { Button } from '@/components/ui/button';
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { buildOAuthCallbackUrl } from '@/lib/auth/build-oauth-callback-url';
import { cn } from '@/lib/class-names';
import { sendMagicLink } from '@/services/auth/magic-link';
import { AUTH_ERROR_CODES } from '@/types/errors';

export interface MagicLinkEmailStepProps extends ComponentProps<'form'> {
	returnTo: string;
	onLinkSent: (email: string) => void;
	onSwitchToPassword: () => void;
	onGoogleSignIn: () => void;
	isSocialPending: boolean;
	socialError: string | null;
}

/** Email input step that sends a magic link — primary sign-in method */
export function MagicLinkEmailStep({
	className,
	returnTo,
	onLinkSent,
	onSwitchToPassword,
	onGoogleSignIn,
	isSocialPending,
	socialError,
	...props
}: MagicLinkEmailStepProps) {
	const {
		register,
		handleSubmit,
		formState: { errors },
		setError,
		clearErrors,
	} = useForm<MagicLinkEmailFormValues>({
		resolver: zodResolver(magicLinkEmailFormSchema),
	});
	const [isPending, setIsPending] = useState(false);
	const [captchaToken, setCaptchaToken] = useState<string | null>(null);
	// Callback ref over `useRef` — react-hooks/refs forbids reading `.current`
	// from a function passed to `handleSubmit`.
	const [turnstile, setTurnstile] = useState<TurnstileWidgetHandle | null>(
		null,
	);

	/** Sends magic link via service and transitions to "link sent" step */
	async function handleSendLink(data: MagicLinkEmailFormValues) {
		clearErrors('root');

		// Submit button is disabled until the widget issues a token, so this
		// guard only fires if a token expired between paint and click. Run
		// before `setIsPending(true)` so a guarded path doesn't flash the
		// pending UI for a single render.
		if (!captchaToken) {
			setError('root', {
				message: getSignInErrorMessage(AUTH_ERROR_CODES.CAPTCHA_MISSING),
			});
			return;
		}
		const submittedToken = captchaToken;

		setIsPending(true);

		const callbackURL = buildOAuthCallbackUrl(window.location.origin, returnTo);
		const result = await sendMagicLink({
			email: data.email,
			callbackURL,
			captchaToken: submittedToken,
		});

		if (!result.success) {
			setError('root', { message: getSignInErrorMessage(result.error) });
			setIsPending(false);
			// Single-use token burned on every backend response; reissue for retry.
			turnstile?.reset();
			setCaptchaToken(null);
			return;
		}

		onLinkSent(data.email);
	}

	const isDisabled = isPending || isSocialPending;

	return (
		<form
			className={cn(SIGN_IN_CARD_CLASS, className)}
			{...props}
			onSubmit={handleSubmit(handleSendLink)}
		>
			<FieldGroup className="mx-auto h-fit w-full max-w-80">
				<LogoIcon className="mx-auto" />

				<div className="my-6 flex flex-col items-center gap-1 text-center">
					<h1 className="font-clash-display line text-4xl font-semibold">
						Ready to sign in?
					</h1>
					<p className="text-muted-foreground">
						You one step forward to big win!
					</p>
				</div>
				<Field>
					<FieldLabel htmlFor="magic-link-email">Enter your email</FieldLabel>
					<Input
						id="magic-link-email"
						type="email"
						placeholder="Type your email"
						required
						autoFocus
						aria-invalid={!!errors.email}
						{...register('email')}
					/>
					<FieldError errors={[errors.email]} />
				</Field>
				<button
					type="button"
					onClick={onSwitchToPassword}
					disabled={isDisabled}
					className="text-muted-foreground w-fit text-sm underline-offset-4 hover:underline"
				>
					Login with a password
				</button>
				<TurnstileWidget
					ref={setTurnstile}
					onToken={setCaptchaToken}
					onExpire={() => setCaptchaToken(null)}
					onError={() => setCaptchaToken(null)}
					className="mt-2 flex justify-center"
				/>
				<FieldError errors={[errors.root]} />
				{socialError ? (
					<p className="text-destructive text-sm">{socialError}</p>
				) : null}
				<Field className="mt-4">
					<Button
						type="submit"
						disabled={isDisabled || !captchaToken}
						className="font-clash-display px-6 py-4 text-lg font-semibold"
					>
						{isPending ? 'Sending...' : 'Sign In'}
					</Button>
				</Field>
				<SignInFooter
					returnTo={returnTo}
					onGoogleSignIn={onGoogleSignIn}
					isSocialPending={isSocialPending}
				/>
			</FieldGroup>
		</form>
	);
}
