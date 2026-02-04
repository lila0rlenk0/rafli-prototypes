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
import { PasswordInput } from '@/components/ui/password-input';
import { cn } from '@/lib/utils';
import { validateReturnTo } from '@/lib/utils/validate-return-to';
import { signInUser } from '@/services/auth/sign-in-user';
import { initiateSocialSignIn } from '@/services/auth/social-sign-in';
import {
	AUTH_ERROR_CODES,
	COMMON_ERROR_CODES,
	type AuthErrorCode,
} from '@/types/errors';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition, type ComponentProps } from 'react';
import { useForm } from 'react-hook-form';
import { FaGoogle } from 'react-icons/fa';
import { z } from 'zod';
import { LogoIcon } from '@/assets/logo-icon';

const formSchema = z.object({
	email: z.email('Invalid email address'),
	password: z
		.string()
		.min(12, 'Password must be at least 12 characters')
		.max(128),
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
	const searchParams = useSearchParams();

	/**
	 * Gets validated returnTo URL from search params
	 * Prevents open redirect attacks by validating the path
	 * @returns Safe returnTo URL or default /browse
	 */
	function getReturnTo(): string {
		return validateReturnTo(searchParams.get('returnTo'));
	}

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

			// Success - redirect to returnTo or default to browse
			const returnTo = getReturnTo();
			router.push(returnTo);
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

		const returnTo = getReturnTo();
		const result = await initiateSocialSignIn({
			provider: 'google',
			callbackURL: `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`,
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
			className={cn(
				'flex w-full max-w-md flex-col rounded-2xl border border-black bg-white px-8 py-10 lg:px-12 lg:py-12',
				className,
			)}
			{...props}
			onSubmit={handleSubmit(handleSignIn)}
		>
			<FieldGroup className="mx-auto h-fit w-full max-w-80">
				<LogoIcon className="mx-auto" />

				<div className="my-6 flex flex-col items-center gap-1 text-center">
					<h1 className="font-clash-display line text-4xl font-semibold">
						Ready to sign in?
					</h1>
					<p className="text-muted-foreground">
						You one step forward to big win!
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
					<PasswordInput
						id="password"
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
					<Button
						type="submit"
						disabled={isPending}
						className="font-clash-display px-6 py-4 text-lg font-semibold"
					>
						{isPending ? 'Signing in...' : 'Sign In'}
					</Button>
				</Field>
				<FieldSeparator className="my-1">
					or do it via other accounts
				</FieldSeparator>
				<Field className="flex flex-col space-y-4">
					<div className="flex w-full items-center justify-center">
						<Button
							variant="outline"
							type="button"
							className="size-12! w-fit bg-white/95"
							onClick={handleGoogleSignIn}
							disabled={isPending || isSocialPending}
						>
							{isSocialPending ? (
								<Loader className="animate-spin" />
							) : (
								<FaGoogle className="size-6" />
							)}
							<span className="sr-only">Login with Google</span>
						</Button>
					</div>
					<FieldDescription className="text-center">
						Don&apos;t have an account?{' '}
						<Link href={`/sign-up?returnTo=${encodeURIComponent(getReturnTo())}`} className="text-black">
							Sign up
						</Link>
					</FieldDescription>
				</Field>
			</FieldGroup>
		</form>
	);
}
