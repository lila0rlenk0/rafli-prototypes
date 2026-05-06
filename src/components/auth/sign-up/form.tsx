'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, useTransition, type ComponentProps } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { LogoIcon } from '@/assets/logo-icon';
import {
	SignUpCredentialFields,
	type SignUpFields,
} from '@/components/auth/sign-up/credential-fields';
import { getSignUpErrorMessage } from '@/components/auth/sign-up/error-messages';
import { SignUpSocialActions } from '@/components/auth/sign-up/social-actions';
import {
	TurnstileWidget,
	type TurnstileWidgetHandle,
} from '@/components/auth/turnstile/turnstile-widget';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup } from '@/components/ui/field';
import { buildOAuthCallbackUrl } from '@/lib/auth/build-oauth-callback-url';
import { cn } from '@/lib/class-names';
import { validateReturnTo } from '@/lib/utils/routing/validate-return-to';
import { registerUser } from '@/services/auth/register-user';
import { initiateSocialSignIn } from '@/services/auth/social-sign-in';
import { AUTH_ERROR_CODES } from '@/types/errors';

const formSchema = z.object({
	name: z.string().min(3, 'Name must be at least 3 characters').max(50),
	email: z.email('Invalid email address'),
	password: z
		.string()
		.min(12, 'Password must be at least 12 characters')
		.max(128),
}) satisfies z.ZodType<SignUpFields>;

/**
 * Sign-up form with name/email/password fields and Google OAuth option.
 * 'use client' required: uses useForm, useTransition, useState,
 * useSearchParams, useRouter, and useMemo.
 *
 * @returns Registration form with social sign-in alternative.
 */
export function SignUpForm({ className, ...props }: ComponentProps<'form'>) {
	const searchParams = useSearchParams();
	const {
		register,
		handleSubmit,
		formState: { errors },
		setError,
	} = useForm<SignUpFields>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: '',
			email: '',
			password: '',
		},
	});
	const [isPending, startTransition] = useTransition();
	const [isSocialPending, setIsSocialPending] = useState(false);
	const [captchaToken, setCaptchaToken] = useState<string | null>(null);
	// Callback ref instead of `useRef` — react-hooks/refs forbids reading
	// `.current` from a function passed to `handleSubmit` (the linter cannot
	// prove the function isn't invoked during render). Storing the imperative
	// handle as state turns the access into a normal closure read.
	const [turnstile, setTurnstile] = useState<TurnstileWidgetHandle | null>(
		null,
	);
	const router = useRouter();
	// useMemo: avoid re-running validateReturnTo on every render — searchParams
	// only changes on URL navigation, so this effectively caches the validated path.
	const returnTo = useMemo(
		() => validateReturnTo(searchParams.get('returnTo')),
		[searchParams],
	);

	function handleSignUp(data: SignUpFields) {
		// Submit button is disabled until the widget issues a token, so this
		// guard only fires if a token expired between paint and click. Treating
		// it as a missing-captcha keeps the message consistent with the backend.
		if (!captchaToken) {
			setError('root', {
				message: getSignUpErrorMessage(AUTH_ERROR_CODES.CAPTCHA_MISSING),
			});
			return;
		}
		const submittedToken = captchaToken;

		startTransition(async () => {
			const result = await registerUser({
				...data,
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

	async function handleGoogleSignIn() {
		setIsSocialPending(true);

		const result = await initiateSocialSignIn({
			provider: 'google',
			callbackURL: buildOAuthCallbackUrl(window.location.origin, returnTo),
		});

		if (!result.success) {
			setError('root', { message: getSignUpErrorMessage(result.error) });
			setIsSocialPending(false);
			return;
		}

		// Cross-origin redirect — must use window.location, not router.push.
		window.location.href = result.data.url;
	}

	return (
		<form
			className={cn(
				'flex w-full max-w-md flex-col rounded-2xl border border-black bg-white px-8 py-10 lg:p-12',
				className,
			)}
			{...props}
			onSubmit={handleSubmit(handleSignUp)}
		>
			<FieldGroup className="mx-auto h-fit w-full max-w-80 gap-2">
				<LogoIcon className="mx-auto" />
				<div className="my-4 flex flex-col items-center gap-1 text-center">
					<h1 className="font-clash-display text-4xl font-semibold">
						Create your account
					</h1>
					<p className="text-muted-foreground">
						You one step forward to big win!
					</p>
				</div>
				<SignUpCredentialFields register={register} errors={errors} />
				<TurnstileWidget
					ref={setTurnstile}
					action="sign-up"
					onToken={setCaptchaToken}
					onExpire={() => setCaptchaToken(null)}
					onError={() => setCaptchaToken(null)}
					className="mt-2 flex justify-center"
				/>
				<FieldError errors={[errors.root]} />
				<Field className="mt-4">
					<Button
						type="submit"
						disabled={isPending || !captchaToken}
						className="font-clash-display px-6 py-4 text-lg font-semibold"
					>
						{isPending ? 'Creating account...' : 'Sign Up'}
					</Button>
				</Field>
				<SignUpSocialActions
					returnTo={returnTo}
					isPending={isPending}
					isSocialPending={isSocialPending}
					onGoogleSignIn={handleGoogleSignIn}
				/>
			</FieldGroup>
		</form>
	);
}
