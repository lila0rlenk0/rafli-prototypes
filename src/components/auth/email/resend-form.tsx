'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { type ComponentProps, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { LogoIcon } from '@/assets/logo-icon';
import {
	TurnstileWidget,
	type TurnstileWidgetHandle,
} from '@/components/auth/turnstile/turnstile-widget';
import { Button } from '@/components/ui/button';
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/class-names';
import { resendVerificationEmail } from '@/services/auth/resend-verification-email';
import {
	AUTH_ERROR_CODES,
	COMMON_ERROR_CODES,
	type AuthErrorCode,
} from '@/types/errors';

/** Email-only schema — no password needed for resend flow */
const formSchema = z.object({
	email: z.email('Invalid email address'),
});

type FormType = z.infer<typeof formSchema>;

/**
 * Maps infrastructure + captcha error codes to user-friendly messages.
 * Account-existence errors are swallowed by the service layer so they
 * never reach this map; captcha failures (added 2026-05 per audit M3)
 * surface so the user can solve a fresh challenge.
 */
function getErrorMessage(errorCode: AuthErrorCode): string {
	switch (errorCode) {
		case AUTH_ERROR_CODES.CAPTCHA_INVALID:
		case AUTH_ERROR_CODES.CAPTCHA_MISSING:
			return 'Please complete the security check before resending.';
		case AUTH_ERROR_CODES.CAPTCHA_UNAVAILABLE:
			return 'Security check service is unavailable. Please try again shortly.';
		case COMMON_ERROR_CODES.GLOBAL_RATELIMIT_EXCEEDED:
			return 'Too many attempts. Please wait a few minutes.';
		case COMMON_ERROR_CODES.NETWORK_ERROR:
			return 'Network error. Please check your connection.';
		case COMMON_ERROR_CODES.TIMEOUT_ERROR:
			return 'Request timed out. Please try again later.';
		case COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR:
			return 'Server error. Please try again later.';
		default:
			return 'An unexpected error occurred.';
	}
}

/**
 * Resend verification email form.
 *
 * 'use client' required: uses useForm for validation, useTransition for
 * non-blocking server action calls, and useState for success state +
 * captcha token lifecycle.
 *
 * Shows a generic success message regardless of account existence — prevents
 * email enumeration attacks. Only infrastructure + captcha errors surface;
 * 4XX account-related errors are swallowed by the service.
 *
 * Captcha gate (audit M3): mailbomb prevention. The verification-email
 * endpoint accepts arbitrary addresses (the backend silently drops unknown
 * ones to preserve the enumeration-safe contract), so without a captcha
 * an attacker with a residential proxy pool can spray the platform's
 * CleverTap quota at any list of emails. Turnstile here forces every
 * resend through the human-challenge cost.
 *
 * @returns Form with email input + Turnstile widget, or success confirmation
 */
export function ResendVerificationForm({
	className,
	...props
}: ComponentProps<'form'>) {
	const {
		register,
		handleSubmit,
		formState: { errors },
		setError,
	} = useForm<FormType>({
		resolver: zodResolver(formSchema),
	});
	const [isPending, startTransition] = useTransition();
	const [isSuccess, setIsSuccess] = useState(false);
	const [captchaToken, setCaptchaToken] = useState<string | null>(null);
	// Callback ref instead of `useRef` — react-hooks/refs forbids reading
	// `.current` from a function passed to `handleSubmit`. Storing the
	// imperative handle as state turns the access into a normal closure read.
	const [turnstile, setTurnstile] = useState<TurnstileWidgetHandle | null>(
		null,
	);

	/** Calls server action and transitions to success or error state */
	async function handleResend(data: FormType) {
		// Submit button is disabled until the widget issues a token, so this
		// guard only fires if a token expired between paint and click. Treat
		// it as a missing-captcha so the message matches the backend URN.
		if (!captchaToken) {
			setError('root', {
				message: getErrorMessage(AUTH_ERROR_CODES.CAPTCHA_MISSING),
			});
			return;
		}
		const submittedToken = captchaToken;

		startTransition(async () => {
			// Step 1: Call server action — backend always returns success for
			// account-related branches but surfaces infra + captcha errors.
			const result = await resendVerificationEmail({
				captchaToken: submittedToken,
				email: data.email,
			});

			// Step 2: Surface infra + captcha errors. Token is single-use —
			// reset on every failure so the next retry has a fresh challenge.
			if (!result.success) {
				const message = getErrorMessage(result.error);
				setError('root', { message });
				turnstile?.reset();
				setCaptchaToken(null);
				return;
			}

			// Step 3: Show generic success — intentionally vague regardless of
			// account existence to preserve the enumeration-safe contract.
			setIsSuccess(true);
		});
	}

	if (isSuccess) {
		return (
			<div
				className={cn(
					'flex w-full max-w-md flex-col rounded-2xl border border-black bg-white px-8 py-10 lg:p-12',
					className,
				)}
			>
				<FieldGroup className="mx-auto h-fit w-full max-w-80">
					<LogoIcon className="mx-auto" />
					<div className="my-6 flex flex-col items-center gap-1 text-center">
						<h1 className="font-clash-display text-4xl font-semibold">
							Check your email
						</h1>
						<p className="text-muted-foreground">
							If an account exists with that email and it hasn&apos;t been
							verified yet, we&apos;ve sent a new verification link.
						</p>
					</div>
					<Field className="mt-4">
						<Button
							asChild
							className="font-clash-display px-6 py-4 text-lg font-semibold"
						>
							<Link href="/sign-in">Back to Sign In</Link>
						</Button>
					</Field>
				</FieldGroup>
			</div>
		);
	}

	return (
		<form
			className={cn(
				'flex w-full max-w-md flex-col rounded-2xl border border-black bg-white px-8 py-10 lg:p-12',
				className,
			)}
			{...props}
			onSubmit={handleSubmit(handleResend)}
		>
			<FieldGroup className="mx-auto h-fit w-full max-w-80">
				<LogoIcon className="mx-auto" />
				<div className="my-6 flex flex-col items-center gap-1 text-center">
					<h1 className="font-clash-display text-4xl font-semibold">
						Resend verification
					</h1>
					<p className="text-muted-foreground">
						Enter your email and we&apos;ll send a new verification link.
					</p>
				</div>
				<Field>
					<FieldLabel htmlFor="email">Email</FieldLabel>
					<Input
						id="email"
						type="email"
						placeholder="Type your email"
						required
						aria-invalid={!!errors.email}
						{...register('email')}
					/>
					<FieldError errors={[errors.email]} />
				</Field>
				<TurnstileWidget
					ref={setTurnstile}
					action="send-verification"
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
						{isPending ? 'Sending...' : 'Send Verification Email'}
					</Button>
				</Field>
				<FieldDescription className="text-center">
					Already verified?{' '}
					<Link href="/sign-in" className="text-black">
						Sign in
					</Link>
				</FieldDescription>
			</FieldGroup>
		</form>
	);
}
