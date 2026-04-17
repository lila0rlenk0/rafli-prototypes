'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { type ComponentProps, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { LogoIcon } from '@/assets/logo-icon';
import { Button } from '@/components/ui/button';
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { requestPasswordReset } from '@/services/auth/request-password-reset';
import { COMMON_ERROR_CODES, type AuthErrorCode } from '@/types/errors';

/** Email-only schema — no password needed for forgot-password flow */
const formSchema = z.object({
	email: z.email('Invalid email address'),
});

type FormType = z.infer<typeof formSchema>;

/**
 * Maps infrastructure error codes to user-friendly messages.
 * Only infrastructure errors reach here — the service layer swallows
 * account-existence signals to prevent email enumeration.
 */
function getErrorMessage(errorCode: AuthErrorCode): string {
	switch (errorCode) {
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

	/** Calls server action to request password reset email */
	async function handleRequestReset(data: FormType) {
		startTransition(async () => {
			// Step 1: Request reset — redirectTo tells backend where the reset link should point
			const result = await requestPasswordReset({
				email: data.email,
				redirectTo: `${window.location.origin}/reset-password`,
			});

			// Step 2: Only infrastructure errors surface (rate limit, network, timeout)
			if (!result.success) {
				const message = getErrorMessage(result.error);
				setError('root', { message });
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
					'flex w-full max-w-md flex-col rounded-2xl border border-black bg-white px-8 py-10 lg:px-12 lg:py-12',
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
				'flex w-full max-w-md flex-col rounded-2xl border border-black bg-white px-8 py-10 lg:px-12 lg:py-12',
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
				<FieldError errors={[errors.root]} />
				<Field className="mt-4">
					<Button
						type="submit"
						disabled={isPending}
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
