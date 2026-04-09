'use client';

import { LogoIcon } from '@/assets/logo-icon';
import { Button } from '@/components/ui/button';
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from '@/components/ui/field';
import { PasswordInput } from '@/components/ui/password-input';
import { cn } from '@/lib/utils';
import { resetPassword } from '@/services/auth/reset-password';
import {
	AUTH_ERROR_CODES,
	COMMON_ERROR_CODES,
	type AuthErrorCode,
} from '@/types/errors';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ComponentProps, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const formSchema = z
	.object({
		newPassword: z
			.string()
			.min(12, 'Password must be at least 12 characters')
			.max(128),
		confirmPassword: z.string(),
	})
	.refine(data => data.newPassword === data.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword'],
	});

type FormType = z.infer<typeof formSchema>;

interface ResetPasswordFormProps extends ComponentProps<'form'> {
	token: string;
}

/**
 * Maps auth and infrastructure error codes to user-friendly messages.
 * Token errors (invalid, expired) prompt user to request a new link.
 * Password-specific errors (compromised) ask for a different password.
 */
function getErrorMessage(errorCode: AuthErrorCode): string {
	switch (errorCode) {
		case AUTH_ERROR_CODES.INVALID_TOKEN:
		case AUTH_ERROR_CODES.TOKEN_EXPIRED:
			return 'This reset link is invalid or has expired. Please request a new one.';
		case AUTH_ERROR_CODES.PASSWORD_COMPROMISED:
			return 'This password has appeared in data breaches. Please choose a different one.';
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
 * Password reset form. Requires a valid one-time token from the reset email.
 *
 * 'use client' required: uses useForm for validation with Zod refinement
 * (password match), useTransition for non-blocking server action, useRouter
 * for post-reset redirect, and toast for success feedback.
 *
 * @returns Form with new password + confirm password fields
 */
export function ResetPasswordForm({
	token,
	className,
	...props
}: ResetPasswordFormProps) {
	const {
		register,
		handleSubmit,
		formState: { errors },
		setError,
	} = useForm<FormType>({
		resolver: zodResolver(formSchema),
	});
	const [isPending, startTransition] = useTransition();
	const router = useRouter();

	/** Submits the new password with the one-time reset token */
	async function handleResetPassword(data: FormType) {
		startTransition(async () => {
			// Step 1: Call server action with the token and new password
			const result = await resetPassword({
				token,
				newPassword: data.newPassword,
			});

			// Step 2: Surface error — token may be expired or password compromised
			if (!result.success) {
				const message = getErrorMessage(result.error);
				setError('root', { message });
				return;
			}

			// Step 3: Success — toast confirmation and redirect to sign-in
			toast.success('Password reset successfully!');
			router.push('/sign-in');
		});
	}

	return (
		<form
			className={cn(
				'flex w-full max-w-md flex-col rounded-2xl border border-black bg-white px-8 py-10 lg:px-12 lg:py-12',
				className,
			)}
			{...props}
			onSubmit={handleSubmit(handleResetPassword)}
		>
			<FieldGroup className="mx-auto h-fit w-full max-w-80">
				<LogoIcon className="mx-auto" />
				<div className="my-6 flex flex-col items-center gap-1 text-center">
					<h1 className="font-clash-display text-4xl font-semibold">
						Reset your password
					</h1>
					<p className="text-muted-foreground">
						Enter your new password below.
					</p>
				</div>
				<Field>
					<FieldLabel htmlFor="newPassword">New Password</FieldLabel>
					<PasswordInput
						id="newPassword"
						placeholder="********"
						required
						aria-invalid={!!errors.newPassword}
						{...register('newPassword')}
					/>
					<FieldError errors={[errors.newPassword]} />
				</Field>
				<Field>
					<FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
					<PasswordInput
						id="confirmPassword"
						placeholder="********"
						required
						aria-invalid={!!errors.confirmPassword}
						{...register('confirmPassword')}
					/>
					<FieldError errors={[errors.confirmPassword]} />
				</Field>
				<FieldError errors={[errors.root]} />
				<Field className="mt-4">
					<Button
						type="submit"
						disabled={isPending}
						className="font-clash-display px-6 py-4 text-lg font-semibold"
					>
						{isPending ? 'Resetting...' : 'Reset Password'}
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
