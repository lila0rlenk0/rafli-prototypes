'use client';

import { Button } from '@/components/ui/button';
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { changePassword } from '@/services/auth/change-password';
import {
	AUTH_ERROR_CODES,
	COMMON_ERROR_CODES,
	type AuthErrorCode,
} from '@/types/errors';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const formSchema = z
	.object({
		currentPassword: z.string().min(1, 'Current password is required'),
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

/**
 * Maps error codes to user-friendly messages
 */
function getErrorMessage(errorCode: AuthErrorCode): string {
	switch (errorCode) {
		case AUTH_ERROR_CODES.PASSWORD_INVALID:
			return 'Current password is incorrect.';
		case AUTH_ERROR_CODES.PASSWORD_NOT_SET:
			return 'Password change is not available for social login accounts.';
		case AUTH_ERROR_CODES.PASSWORD_COMPROMISED:
			return 'This password has appeared in data breaches. Please choose a different one.';
		case COMMON_ERROR_CODES.GLOBAL_AUTH_UNAUTHENTICATED:
			return 'Please sign in again to change your password.';
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
 * ChangePasswordForm Component
 *
 * Form for authenticated users to change their password.
 * Validates current password and checks new password against HIBP.
 */
export function ChangePasswordForm() {
	const {
		register,
		handleSubmit,
		formState: { errors },
		setError,
		reset,
	} = useForm<FormType>({
		resolver: zodResolver(formSchema),
	});
	const [isPending, startTransition] = useTransition();
	const [isOpen, setIsOpen] = useState(false);

	/**
	 * Handles form submission
	 */
	function handleChangePassword(data: FormType) {
		startTransition(async () => {
			const result = await changePassword({
				currentPassword: data.currentPassword,
				newPassword: data.newPassword,
			});

			if (!result.success) {
				const message = getErrorMessage(result.error);
				setError('root', { message });
				return;
			}

			toast.success('Password changed successfully!');
			reset();
			setIsOpen(false);
		});
	}

	if (!isOpen) {
		return (
			<Button
				variant="outline"
				onClick={() => setIsOpen(true)}
				className="w-fit"
			>
				Change Password
			</Button>
		);
	}

	return (
		<form onSubmit={handleSubmit(handleChangePassword)} className="space-y-4">
			<FieldGroup className="gap-3">
				<Field>
					<FieldLabel htmlFor="currentPassword">Current Password</FieldLabel>
					<Input
						id="currentPassword"
						type="password"
						placeholder="********"
						required
						aria-invalid={!!errors.currentPassword}
						{...register('currentPassword')}
					/>
					<FieldError errors={[errors.currentPassword]} />
				</Field>
				<Field>
					<FieldLabel htmlFor="newPassword">New Password</FieldLabel>
					<Input
						id="newPassword"
						type="password"
						placeholder="********"
						required
						aria-invalid={!!errors.newPassword}
						{...register('newPassword')}
					/>
					<FieldError errors={[errors.newPassword]} />
				</Field>
				<Field>
					<FieldLabel htmlFor="confirmPassword">
						Confirm New Password
					</FieldLabel>
					<Input
						id="confirmPassword"
						type="password"
						placeholder="********"
						required
						aria-invalid={!!errors.confirmPassword}
						{...register('confirmPassword')}
					/>
					<FieldError errors={[errors.confirmPassword]} />
				</Field>
				<FieldError errors={[errors.root]} />
				<div className="flex gap-2">
					<Button type="submit" disabled={isPending}>
						{isPending ? 'Changing...' : 'Change Password'}
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() => {
							reset();
							setIsOpen(false);
						}}
						disabled={isPending}
					>
						Cancel
					</Button>
				</div>
			</FieldGroup>
		</form>
	);
}
