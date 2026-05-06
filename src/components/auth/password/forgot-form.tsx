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
import { requestPasswordReset } from '@/services/auth/request-password-reset';
import {
	AUTH_ERROR_CODES,
	COMMON_ERROR_CODES,
	type AuthErrorCode,
} from '@/types/errors';

/** Email-only schema — no password needed for forgot-password flow */
const formSchema = z.object({
	email: z.email('Invalid email address'),
});

type FormType = z.infer<typeof formSchema>;

/**
 * Maps infrastructure error codes to user-friendly messages.
 *
 * Only infrastructure errors and captcha failures reach here — the service
 * layer swallows account-existence signals to prevent email enumeration. The
 * captcha cases must surface so the user can retry the challenge; collapsing
 * them into the generic fallback would leave them stuck with no actionable
 * message after a token expires or fails verification.
 */
function getErrorMessage(errorCode: AuthErrorCode): string {
	switch (errorCode) {
		case AUTH_ERROR_CODES.CAPTCHA_INVALID:
			return 'Verification failed. Please try again.';
		case AUTH_ERROR_CODES.CAPTCHA_MISSING:
			return 'Please complete the verification challenge.';
		case AUTH_ERROR_CODES.CAPTCHA_UNAVAILABLE:
			return 'Verification service unavailable. Please try again shortly.';
		case COMMON_ERROR_CODES.GLOBAL_RATELIMIT_EXCEEDED:
			return 'Too many attempts. Please wait a moment.';
		case COMMON_ERROR_CODES.NETWORK_ERROR:
			return 'Network error. Please check your connection.';
		case COMMON_ERROR_CODES.TIMEOUT_ERROR:
			return 'Request timed out. Please try again.';
		case COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR:
			return 'Server error. Please try again later.';
		default:
			return 'An unexpected error occurred.';
	}
}

/**
 * Email input form to request a password reset link.
 *
 * 'use client' required: uses useForm for validation, useTransition for
 * non-blocking server action calls, and useState for success state.
 *
 * Shows a generic success state to prevent user enumeration — the backend
 * always returns success regardless of whether the email exists.
 *
 * @returns Form with email input, or success confirmation after submission
 */
export function ForgotPasswordForm({
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
	// Callback ref over `useRef` — react-hooks/refs forbids reading `.current`
	// from a function passed to `handleSubmit`.
	const [turnstile, setTurnstile] = useState<TurnstileWidgetHandle | null>(
		null,
	);

	/** Calls server action to request password reset email */
	async function handleRequestReset(data: FormType) {
		// Submit button is disabled until the widget issues a token, so this
		// guard only fires if a token expired between paint and click.
		if (!captchaToken) {
			setError('root', {
				message: getErrorMessage(AUTH_ERROR_CODES.CAPTCHA_MISSING),
			});
			return;
		}
		const submittedToken = captchaToken;

		startTransition(async () => {
			// Step 1: Request reset — redirectTo tells backend where the reset link should point
			const result = await requestPasswordReset({
				email: data.email,
				redirectTo: `${window.location.origin}/reset-password`,
				captchaToken: submittedToken,
			});

			// Step 2: Only infrastructure / captcha errors surface (rate limit,
			// network, timeout, captcha) — account-existence errors are swallowed
			// to prevent email enumeration.
			if (!result.success) {
				const message = getErrorMessage(result.error);
				setError('root', { message });
				// Single-use token burned on every backend response; reissue for retry.
				turnstile?.reset();
				setCaptchaToken(null);
				return;
			}

			// Step 3: Generic success — intentionally vague to prevent enumeration
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
							If an account exists with that email, we&apos;ve sent password
							reset instructions.
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
			onSubmit={handleSubmit(handleRequestReset)}
		>
			<FieldGroup className="mx-auto h-fit w-full max-w-80">
				<LogoIcon className="mx-auto" />
				<div className="my-6 flex flex-col items-center gap-1 text-center">
					<h1 className="font-clash-display text-4xl font-semibold">
						Forgot your password?
					</h1>
					<p className="text-muted-foreground">
						Enter your email and we&apos;ll send you reset instructions.
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
					action="forget-password"
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
						{isPending ? 'Sending...' : 'Send Reset Link'}
					</Button>
				</Field>
				<FieldDescription className="text-center">
					Remember your password?{' '}
					<Link href="/sign-in" className="text-black">
						Sign in
					</Link>
				</FieldDescription>
			</FieldGroup>
		</form>
	);
}
