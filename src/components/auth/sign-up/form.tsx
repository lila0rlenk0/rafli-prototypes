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
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup } from '@/components/ui/field';
import { buildOAuthCallbackUrl } from '@/lib/auth/build-oauth-callback-url';
import { cn } from '@/lib/class-names';
import { validateReturnTo } from '@/lib/utils/routing/validate-return-to';
import { registerUser } from '@/services/auth/register-user';
import { initiateSocialSignIn } from '@/services/auth/social-sign-in';

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
	const router = useRouter();
	// useMemo: avoid re-running validateReturnTo on every render — searchParams
	// only changes on URL navigation, so this effectively caches the validated path.
	const returnTo = useMemo(
		() => validateReturnTo(searchParams.get('returnTo')),
		[searchParams],
	);

	function handleSignUp(data: SignUpFields) {
		startTransition(async () => {
			const result = await registerUser(data);

			if (!result.success) {
				setError('root', { message: getSignUpErrorMessage(result.error) });
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
				<FieldError errors={[errors.root]} />
				<Field className="mt-4">
					<Button
						type="submit"
						disabled={isPending}
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
