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
import { LogoIcon } from '@/assets/logo-icon';
import { buildOAuthCallbackUrl } from '@/lib/auth/build-oauth-callback-url';
import { cn } from '@/lib/utils';
import { validateReturnTo } from '@/lib/utils/validate-return-to';
import { registerUser } from '@/services/auth/register-user';
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
import { toast } from 'sonner';
import { z } from 'zod';

const formSchema = z.object({
	name: z.string().min(3, 'Name must be at least 3 characters').max(50),
	email: z.email('Invalid email address'),
	password: z
		.string()
		.min(12, 'Password must be at least 12 characters')
		.max(128),
});

type FormType = z.infer<typeof formSchema>;

/**
 * Maps error codes to user-friendly messages
 */
function getErrorMessage(errorCode: AuthErrorCode): string {
	switch (errorCode) {
		// Backend auth errors
		case AUTH_ERROR_CODES.USER_ALREADY_EXISTS:
		case AUTH_ERROR_CODES.SIGNUP_FAILED:
			// Generic message to prevent user enumeration
			return 'Unable to create account. Please try again or sign in.';
		case AUTH_ERROR_CODES.PASSWORD_COMPROMISED:
			return 'This password has appeared in data breaches. Please choose a different one.';
		case AUTH_ERROR_CODES.SOCIAL_LOGIN_FAILED:
		case AUTH_ERROR_CODES.SOCIAL_PROVIDER_ERROR:
		case AUTH_ERROR_CODES.SOCIAL_CALLBACK_FAILED:
		case AUTH_ERROR_CODES.SOCIAL_TOKEN_EXCHANGE_FAILED:
			return 'Google sign in failed. Please try again.';

		// Common fallback errors
		case COMMON_ERROR_CODES.GLOBAL_RATELIMIT_EXCEEDED:
			return 'Too many attempts. Please wait a moment.';
		case COMMON_ERROR_CODES.NETWORK_ERROR:
			return 'Network error. Please check your connection.';
		case COMMON_ERROR_CODES.TIMEOUT_ERROR:
			return 'Request timed out. Please try again.';
		case COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR:
			return 'Server error. Please try again later.';
		default:
			return 'An unexpected error occurred. Please try again.';
	}
}

export function SignUpForm({ className, ...props }: ComponentProps<'form'>) {
	const {
		register,
		handleSubmit,
		formState: { errors },
		setError,
	} = useForm<FormType>({
		resolver: zodResolver(formSchema),
	});
	const [isPending, startTransition] = useTransition();
	const [isSocialPending, setIsSocialPending] = useState(false);
	const router = useRouter();
	const searchParams = useSearchParams();
	const returnTo = validateReturnTo(searchParams.get('returnTo'));

	async function handleSignUp(data: FormType) {
		startTransition(async () => {
			// Step 1: Call registration service.
			const result = await registerUser(data);

			// Type-safe response handling
			if (!result.success) {
				// Step 2: Surface error.
				const message = getErrorMessage(result.error);
				setError('root', { message });
				return;
			}

			// Step 3: Notify and redirect to sign-in with returnTo preserved.
			toast.success(
				'Account created! Check your email to verify before signing in.',
			);
			router.push(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
		});
	}

	/**
	 * Handles Google sign-in button click
	 * Initiates OAuth flow by redirecting to Google
	 */
	async function handleGoogleSignIn() {
		setIsSocialPending(true);

		// Step 1: Build callback URL with validated returnTo.
		const result = await initiateSocialSignIn({
			provider: 'google',
			callbackURL: buildOAuthCallbackUrl(window.location.origin, returnTo),
		});

		if (!result.success) {
			// Step 2: Surface error.
			setError('root', { message: getErrorMessage(result.error) });
			setIsSocialPending(false);
			return;
		}

		// Step 3: Redirect to provider.
		window.location.href = result.data.url;
	}

	return (
		<form
			className={cn(
				'flex w-full max-w-md flex-col rounded-2xl border border-black bg-white px-8 py-10 lg:px-12 lg:py-12',
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
				<Field>
					<FieldLabel htmlFor="name">Name</FieldLabel>
					<Input
						id="name"
						type="text"
						placeholder="John Doe"
						required
						aria-invalid={!!errors.name}
						{...register('name')}
					/>
					<FieldError errors={[errors.name]} />
				</Field>
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
					<FieldLabel htmlFor="password">Password</FieldLabel>
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
				<Field className="mt-4">
					<Button
						type="submit"
						disabled={isPending}
						className="font-clash-display px-6 py-4 text-lg font-semibold"
					>
						{isPending ? 'Creating account...' : 'Sign Up'}
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
						Already have an account?{' '}
						<Link
							href={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`}
							className="text-black"
						>
							Sign in
						</Link>
					</FieldDescription>
				</Field>
			</FieldGroup>
		</form>
	);
}
