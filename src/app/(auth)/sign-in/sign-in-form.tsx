'use client';

import { Button } from '@/components/ui/button';
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldSeparator,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { signInUser } from '@/services/auth/sign-in-user';
import { initiateSocialSignIn } from '@/services/auth/social-sign-in';
import { AUTH_ERROR_CODES, COMMON_ERROR_CODES, type AuthErrorCode } from '@/types/errors';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type ComponentProps } from 'react';
import { useForm } from 'react-hook-form';
import { FaGoogle } from 'react-icons/fa';
import { z } from 'zod';

const formSchema = z.object({
	email: z.email('Invalid email address'),
	password: z.string().min(12, 'Password must be at least 12 characters').max(128),
});

type FormType = z.infer<typeof formSchema>;

/**
 * Maps error codes to user-friendly messages
 * This is where error messages are defined (not in services)
 */
function getErrorMessage(errorCode: AuthErrorCode): string {
	switch (errorCode) {
		// Backend auth errors
		case AUTH_ERROR_CODES.INVALID_CREDENTIALS:
			return 'Invalid email or password.';
		case AUTH_ERROR_CODES.TOKEN_EXPIRED:
			return 'Your session has expired.';
		case AUTH_ERROR_CODES.SOCIAL_LOGIN_FAILED:
		case AUTH_ERROR_CODES.SOCIAL_PROVIDER_ERROR:
		case AUTH_ERROR_CODES.SOCIAL_CALLBACK_FAILED:
		case AUTH_ERROR_CODES.SOCIAL_TOKEN_EXCHANGE_FAILED:
			return 'Google sign in failed. Please try again.';

		// Common fallback errors
		case COMMON_ERROR_CODES.GLOBAL_AUTH_UNAUTHENTICATED:
		case COMMON_ERROR_CODES.UNAUTHORIZED:
			return 'Authentication failed.';
		case COMMON_ERROR_CODES.GLOBAL_RATELIMIT_EXCEEDED:
			return 'Too many attempts. Please wait a moment.';
		case COMMON_ERROR_CODES.NETWORK_ERROR:
			return 'Network error. Please check your connection.';
		case COMMON_ERROR_CODES.TIMEOUT_ERROR:
			return 'Request timed out.';
		case COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR:
			return 'Server error.';
		default:
			return 'An unexpected error occurred.';
	}
}

export function SignInForm({ className, ...props }: ComponentProps<'form'>) {
	const {
		register,
		handleSubmit,
		formState: { errors },
		setError,
		clearErrors,
	} = useForm<FormType>({
		resolver: zodResolver(formSchema),
	});
	const [isPending, startTransition] = useTransition();
	const [isSocialPending, setIsSocialPending] = useState(false);
	const [hasLoginError, setHasLoginError] = useState(false);
	const router = useRouter();

	/**
	 * Handles form submission
	 */
	async function handleSignIn(data: FormType) {
		clearErrors('root');
		setHasLoginError(false);

		startTransition(async () => {
			const result = await signInUser(data);

			// Type-safe response handling
			if (!result.success) {
				setError('root', { message: getErrorMessage(result.error) });
				setHasLoginError(true);
				return;
			}

			// Success - redirect to dashboard
			router.push('/browse');
			router.refresh();
		});
	}

	/**
	 * Handles Google sign-in button click
	 * Initiates OAuth flow by redirecting to Google
	 */
	async function handleGoogleSignIn() {
		setIsSocialPending(true);
		setHasLoginError(false);

		const result = await initiateSocialSignIn({
			provider: 'google',
			callbackURL: `${window.location.origin}/auth/callback`,
		});

		if (!result.success) {
			setError('root', { message: getErrorMessage(result.error) });
			setIsSocialPending(false);
			return;
		}

		window.location.href = result.data.url;
	}

	return (
		<form
			className={cn('flex flex-col gap-6', className)}
			{...props}
			onSubmit={handleSubmit(handleSignIn)}
		>
			<FieldGroup className="gap-3">
				<div className="font-clash-display flex flex-col items-center gap-1 text-center">
					<h1 className="text-2xl font-bold">Ready to sign in?</h1>
					<p className="text-muted-foreground text-sm font-medium text-balance">
						You one step forward to big win!
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
				<Field>
					<div className="flex items-center">
						<FieldLabel htmlFor="password">Password</FieldLabel>
						<Link
							href="/forgot-password"
							className="ml-auto text-sm underline-offset-4 hover:underline"
						>
							Forgot your password?
						</Link>
					</div>
					<Input
						id="password"
						type="password"
						placeholder="********"
						required
						aria-invalid={!!errors.password}
						{...register('password')}
					/>
					<FieldError errors={[errors.password]} />
				</Field>
				<FieldError errors={[errors.root]} />
				{hasLoginError && (
					<p className="text-muted-foreground text-xs">
						Just signed up? Check your inbox for the verification email.
					</p>
				)}
				<Field className="mt-4">
					<Button type="submit" disabled={isPending}>
						{isPending ? 'Signing in...' : 'Sign In'}
					</Button>
				</Field>
				<FieldSeparator className="my-2">or do it via other accounts</FieldSeparator>
				<Field className="flex flex-col space-y-2">
					<div className="flex w-full items-center justify-center">
						<Button
							variant="outline"
							type="button"
							className="size-12! w-fit"
							onClick={handleGoogleSignIn}
							disabled={isPending || isSocialPending}
						>
							{isSocialPending ? (
								<div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
							) : (
								<FaGoogle className="size-6" />
							)}
							<span className="sr-only">Login with Google</span>
						</Button>
					</div>
					<FieldDescription className="text-center">
						Don&apos;t have an account?{' '}
						<Link href="/sign-up" className="underline underline-offset-4">
							Sign up
						</Link>
					</FieldDescription>
				</Field>
			</FieldGroup>
		</form>
	);
}
