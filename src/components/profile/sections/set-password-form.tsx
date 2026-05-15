'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { setPassword } from '@/services/auth/set-password';
import {
	AUTH_ERROR_CODES,
	COMMON_ERROR_CODES,
	type AuthErrorCode,
} from '@/types/errors';

// Form-level Zod schema — kept here (vs `@/types/auth`) because the
// `confirmPassword` cross-field refinement is UI-only; the wire payload
// uses the simpler `setPasswordInputSchema`. Same pattern as
// change-password-form.tsx.
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

function getErrorMessage(errorCode: AuthErrorCode): string {
	switch (errorCode) {
		case AUTH_ERROR_CODES.PASSWORD_ALREADY_SET:
			// Stale `hasPassword` flag — push them back to the change-password
			// form by refreshing the page. The form switch is driven off the
			// `/me` payload at the route level, so a refresh re-reads it.
			return 'A password is already set on this account. Refresh the page to switch to "Change password".';
		case AUTH_ERROR_CODES.PASSWORD_COMPROMISED:
			return 'This password has appeared in data breaches. Please choose a different one.';
		case COMMON_ERROR_CODES.GLOBAL_AUTH_UNAUTHENTICATED:
			return 'Please sign in again to set your password.';
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
 * Form for OAuth/magic-link users to add a password to their account.
 *
 * Rendered by `SecuritySection` when `hasPassword === false`. Once the BE
 * confirms the set, the next page fetch sees `hasPassword: true` and the
 * section swaps to `<ChangePasswordForm>`.
 *
 * @returns Set-password form with new + confirm fields.
 */
export function SetPasswordForm() {
	const {
		register,
		handleSubmit,
		formState: { errors },
		setError,
		reset,
	} = useForm<FormType>({
		resolver: zodResolver(formSchema),
	});
	// useTransition: keeps the form interactive during the server action.
	// `isPending` disables submit to prevent double-submit.
	const [isPending, startTransition] = useTransition();

	function handleSetPassword(data: FormType) {
		startTransition(async () => {
			const result = await setPassword({ newPassword: data.newPassword });

			if (!result.success) {
				const message = getErrorMessage(result.error);
				setError('root', { message });
				return;
			}

			toast.success('Password set successfully!');
			reset();
		});
	}

	return (
		<form
			onSubmit={handleSubmit(handleSetPassword)}
			className="flex w-full flex-col gap-4 sm:max-w-md md:gap-6"
		>
			<FieldGroup className="gap-3">
				<Field>
					<FieldLabel htmlFor="setNewPassword" className="text-ink-500">
						New Password
					</FieldLabel>
					<Input
						id="setNewPassword"
						type="password"
						placeholder="**********"
						required
						aria-invalid={!!errors.newPassword}
						{...register('newPassword')}
					/>
					<FieldError errors={[errors.newPassword]} />
				</Field>
				<Field>
					<FieldLabel htmlFor="setConfirmPassword" className="text-ink-500">
						Confirm Password
					</FieldLabel>
					<Input
						id="setConfirmPassword"
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
				{isPending ? 'Saving…' : 'Set Password'}
			</Button>
		</form>
	);
}
