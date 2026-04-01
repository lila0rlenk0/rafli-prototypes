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
import { useTransition } from 'react';
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
 *
 * @returns Human-readable error message
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
 * Always displays the three password fields inline.
 *
 * @returns Password change form with current, new, and confirm fields
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
		});
	}

	return (
		<form
			onSubmit={handleSubmit(handleChangePassword)}
			className="flex w-full flex-col gap-4 sm:max-w-md md:gap-6"
		>
			<FieldGroup className="gap-3">
				<Field>
					<FieldLabel htmlFor="currentPassword" className="text-[#7B7B7B]">
						Current Password
					</FieldLabel>
					<Input
						id="currentPassword"
						type="password"
						placeholder="**********"
						required
						aria-invalid={!!errors.currentPassword}
						{...register('currentPassword')}
					/>
					<FieldError errors={[errors.currentPassword]} />
				</Field>
				<Field>
					<FieldLabel htmlFor="newPassword" className="text-[#7B7B7B]">
						New Password
					</FieldLabel>
					<Input
						id="newPassword"
						type="password"
						placeholder="**********"
						required
						aria-invalid={!!errors.newPassword}
						{...register('newPassword')}
					/>
					<FieldError errors={[errors.newPassword]} />
				</Field>
				<Field>
					<FieldLabel htmlFor="confirmPassword" className="text-[#7B7B7B]">
						New Password
					</FieldLabel>
					<Input
						id="confirmPassword"
						type="password"
						placeholder="**********"
						required
						aria-invalid={!!errors.confirmPassword}
						{...register('confirmPassword')}
					/>
					<FieldError errors={[errors.confirmPassword]} />
				</Field>
				<FieldError errors={[errors.root]} />
			</FieldGroup>

			<Button
				type="submit"
				variant="outline"
				disabled={isPending}
				className="w-full border-black text-base font-semibold text-black hover:bg-black hover:text-white sm:w-fit"
			>
				{isPending ? 'Changing...' : 'Change Password'}
			</Button>
		</form>
	);
}
