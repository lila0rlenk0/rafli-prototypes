'use client';

import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { resetPassword } from '@/services/auth/reset-password';
import { AUTH_ERROR_CODES, COMMON_ERROR_CODES, type AuthErrorCode } from '@/types/errors';
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
			.max(50),
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
 * Maps error codes to user-friendly messages
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
 * ResetPasswordForm Component
 *
 * Displays password reset form with new password and confirmation.
 * Requires valid token from email link.
 */
export function ResetPasswordForm({ token, className, ...props }: ResetPasswordFormProps) {
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

	async function handleResetPassword(data: FormType) {
		startTransition(async () => {
			const result = await resetPassword({
				token,
				newPassword: data.newPassword,
			});

			if (!result.success) {
				const message = getErrorMessage(result.error);
				setError('root', { message });
				return;
			}

			toast.success('Password reset successfully!');
			router.push('/sign-in');
		});
	}

	return (
		<form
			className={cn('flex flex-col gap-6', className)}
			{...props}
			onSubmit={handleSubmit(handleResetPassword)}
		>
			<FieldGroup className="gap-3">
				<div className="font-clash-display flex flex-col items-center gap-1 text-center">
					<h1 className="text-2xl font-bold">Reset your password</h1>
					<p className="text-muted-foreground text-sm font-medium text-balance">
						Enter your new password below.
					</p>
				</div>
				<Field>
					<FieldLabel htmlFor="newPassword">New Password</FieldLabel>
					<Input
						id="newPassword"
						type="password"
						placeholder="********"
						required
						aria-invalid={!!errors.newPassword}
						aria-describedby={errors.newPassword ? 'newPassword-error' : undefined}
						{...register('newPassword')}
					/>
					{errors.newPassword && (
						<p id="newPassword-error" className="text-sm text-red-600">
							{errors.newPassword.message}
						</p>
					)}
				</Field>
				<Field>
					<FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
					<Input
						id="confirmPassword"
						type="password"
						placeholder="********"
						required
						aria-invalid={!!errors.confirmPassword}
						aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
						{...register('confirmPassword')}
					/>
					{errors.confirmPassword && (
						<p id="confirmPassword-error" className="text-sm text-red-600">
							{errors.confirmPassword.message}
						</p>
					)}
				</Field>
				{errors.root && (
					<div className="text-sm text-red-600">{errors.root.message}</div>
				)}
				<Field className="mt-4">
					<Button type="submit" disabled={isPending}>
						{isPending ? 'Resetting...' : 'Reset Password'}
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
