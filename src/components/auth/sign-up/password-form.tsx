'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type ComponentProps } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { LogoIcon } from '@/assets/logo-icon';
import { SIGN_UP_CARD_CLASS } from '@/components/auth/sign-up/constants';
import { getSignUpErrorMessage } from '@/components/auth/sign-up/error-messages';
import { SignUpFooter } from '@/components/auth/sign-up/footer';
import {
	passwordSignUpFormSchema,
	type PasswordSignUpFormValues,
} from '@/components/auth/sign-up/schema';
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
import { PasswordInput } from '@/components/ui/password-input';
import { cn } from '@/lib/class-names';
import { registerUser } from '@/services/auth/register-user';
import { AUTH_ERROR_CODES } from '@/types/errors';

export interface PasswordSignUpFormProps extends ComponentProps<'form'> {
	returnTo: string;
	onSwitchToMagicLink: () => void;
	onGoogleSignIn: () => void;
	isSocialPending: boolean;
	socialError: string | null;
}

/** Email + password sign-up form with magic-link toggle */
export function PasswordSignUpForm({
	className,
	returnTo,
	onSwitchToMagicLink,
	onGoogleSignIn,
	isSocialPending,
	socialError,
	...props
}: PasswordSignUpFormProps) {
	const {
		register,
		handleSubmit,
		formState: { errors },
		setError,
		clearErrors,
	} = useForm<PasswordSignUpFormValues>({
		resolver: zodResolver(passwordSignUpFormSchema),
	});
	const [isPending, startTransition] = useTransition();
	const [captchaToken, setCaptchaToken] = useState<string | null>(null);
	// Callback ref over `useRef` — react-hooks/refs forbids reading `.current`
	// from a function passed to `handleSubmit`.
	const [turnstile, setTurnstile] = useState<TurnstileWidgetHandle | null>(
		null,
	);
	const router = useRouter();

	/** Registers the account via server action and redirects to sign-in on success */
	async function handleSignUp(data: PasswordSignUpFormValues) {
		clearErrors('root');

		// Submit button is disabled until the widget issues a token, so this
		// guard only fires if a token expired between paint and click.
		if (!captchaToken) {
			setError('root', {
				message: getSignUpErrorMessage(AUTH_ERROR_CODES.CAPTCHA_MISSING),
			});
			return;
		}
		const submittedToken = captchaToken;

		startTransition(async () => {
			// `name` stays in the wire payload for backend compatibility but is no
			// longer collected by the form — backend derives a default from email.
			const result = await registerUser({
				...data,
				name: '',
				captchaToken: submittedToken,
			});

			if (!result.success) {
				setError('root', { message: getSignUpErrorMessage(result.error) });
				// Captcha tokens are single-use — Cloudflare burns the token even
				// on backend rejections (validation, password compromised, etc.),
				// so we always reset to issue a fresh one for the next attempt.
				turnstile?.reset();
				setCaptchaToken(null);
				return;
			}

			toast.success(
				'Account created! Check your email to verify before signing in.',
			);
			router.push(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
		});
	}

	const isDisabled = isPending || isSocialPending;

	return (
		<form
			className={cn(SIGN_UP_CARD_CLASS, className)}
			{...props}
			onSubmit={handleSubmit(handleSignUp)}
		>
			<FieldGroup className="mx-auto h-fit w-full max-w-80">
				<LogoIcon className="mx-auto" />

				<div className="my-6 flex flex-col items-center gap-1 text-center">
					<h1 className="font-clash-display text-4xl font-semibold">
						Create your account
					</h1>
					<p className="text-muted-foreground">
						You one step forward to big win!
					</p>
				</div>
				<Field>
					<FieldLabel htmlFor="sign-up-email">Email</FieldLabel>
					<Input
						id="sign-up-email"
						type="email"
						placeholder="Type your email"
						required
						aria-invalid={!!errors.email}
						{...register('email')}
					/>
					<FieldError errors={[errors.email]} />
				</Field>
				<Field>
					<FieldLabel htmlFor="sign-up-password">Password</FieldLabel>
					<PasswordInput
						id="sign-up-password"
						placeholder="********"
						required
						aria-invalid={!!errors.password}
						{...register('password')}
					/>
					<FieldError errors={[errors.password]} />
				</Field>
				<button
					type="button"
					onClick={onSwitchToMagicLink}
					disabled={isDisabled}
					className="text-muted-foreground w-fit text-sm underline-offset-4 hover:underline"
				>
					Sign up with a magic link
				</button>
				<TurnstileWidget
					ref={setTurnstile}
					action="sign-up"
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
						{isPending ? 'Creating account...' : 'Sign Up'}
					</Button>
				</Field>
				<SignUpFooter
					returnTo={returnTo}
					onGoogleSignIn={onGoogleSignIn}
					isSocialPending={isSocialPending}
				/>
			</FieldGroup>
		</form>
	);
}
