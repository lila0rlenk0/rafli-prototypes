'use client';

import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { requestPasswordReset } from '@/services/auth/request-password-reset';
import { COMMON_ERROR_CODES, type AuthErrorCode } from '@/types/errors';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { type ComponentProps, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const formSchema = z.object({
	email: z.email('Invalid email address'),
});

type FormType = z.infer<typeof formSchema>;

/**
 * Maps error codes to user-friendly messages
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
 * ForgotPasswordForm Component
 *
 * Displays email input to request password reset.
 * Shows success message after submission.
 */
export function ForgotPasswordForm({ className, ...props }: ComponentProps<'form'>) {
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

	async function handleRequestReset(data: FormType) {
		startTransition(async () => {
			const result = await requestPasswordReset({
				email: data.email,
				redirectTo: `${window.location.origin}/reset-password`,
			});

			if (!result.success) {
				const message = getErrorMessage(result.error);
				setError('root', { message });
				return;
			}

			setIsSuccess(true);
		});
	}

	if (isSuccess) {
		return (
			<div className={cn('flex flex-col gap-6', className)}>
				<FieldGroup className="gap-3">
					<div className="font-clash-display flex flex-col items-center gap-1 text-center">
						<h1 className="text-2xl font-bold">Check your email</h1>
						<p className="text-muted-foreground text-sm font-medium text-balance">
							If an account exists with that email, we&apos;ve sent password reset instructions.
						</p>
					</div>
					<Field className="mt-4">
						<Button asChild>
							<Link href="/sign-in">Back to Sign In</Link>
						</Button>
					</Field>
				</FieldGroup>
			</div>
		);
	}

	return (
		<form
			className={cn('flex flex-col gap-6', className)}
			{...props}
			onSubmit={handleSubmit(handleRequestReset)}
		>
			<FieldGroup className="gap-3">
				<div className="font-clash-display flex flex-col items-center gap-1 text-center">
					<h1 className="text-2xl font-bold">Forgot your password?</h1>
					<p className="text-muted-foreground text-sm font-medium text-balance">
						Enter your email and we&apos;ll send you reset instructions.
					</p>
				</div>
				<Field>
					<FieldLabel htmlFor="email">Email</FieldLabel>
					<Input
						id="email"
						type="email"
						placeholder="m@example.com"
						required
						aria-invalid={!!errors.email}
						{...register('email')}
					/>
					<FieldError errors={[errors.email]} />
				</Field>
				<FieldError errors={[errors.root]} />
				<Field className="mt-4">
					<Button type="submit" disabled={isPending}>
						{isPending ? 'Sending...' : 'Send Reset Link'}
					</Button>
				</Field>
				<FieldDescription className="text-center">
					Remember your password?{' '}
					<Link href="/sign-in" className="underline underline-offset-4">
						Sign in
					</Link>
				</FieldDescription>
			</FieldGroup>
		</form>
	);
}
