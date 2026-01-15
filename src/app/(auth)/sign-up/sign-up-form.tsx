'use client';

import { Button } from '@/components/ui/button';
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldSeparator,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { browserClient } from '@/lib/api/client-browser';
import { cn } from '@/lib/utils';
import { registerUser } from '@/services/auth/register-user';
import { AUTH_ERROR_CODES, COMMON_ERROR_CODES, type AuthErrorCode } from '@/types/errors';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ComponentProps, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { FaGoogle } from 'react-icons/fa';
import { z } from 'zod';

const formSchema = z.object({
	name: z.string().min(3, 'Name must be at least 3 characters').max(50),
	email: z.email('Invalid email address'),
	password: z
		.string()
		.min(12, 'Password must be at least 12 characters')
		.max(50),
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

	async function handleSignUp(data: FormType) {
		startTransition(async () => {
			const result = await registerUser(data);

			// Type-safe response handling
			if (!result.success) {
				const message = getErrorMessage(result.error);
				setError('root', { message });
				return;
			}

			router.push('/sign-in');
		});
	}

	/**
	 * Handles Google sign-in button click
	 * Initiates OAuth flow by redirecting to Google
	 *
	 * IMPORTANT: This request MUST be made directly from the browser (not via server action)
	 * because better-auth sets a state cookie that needs to be stored in the browser.
	 * Using a server action would store the cookie on the Next.js server instead.
	 */
	async function handleGoogleSignIn() {
		setIsSocialPending(true);
		try {
			const callbackURL = `${window.location.origin}/auth/callback`;

			// Make request directly from browser to receive state cookies
			const response = await browserClient.post<{ url?: string }>(
				'/api/auth/sign-in/social',
				{ provider: 'google', callbackURL },
			);

			if (!response.data.url) {
				setError('root', { message: 'Failed to initiate Google sign in.' });
				setIsSocialPending(false);
				return;
			}

			// Redirect to OAuth provider (Google)
			window.location.href = response.data.url;
		} catch {
			setError('root', { message: 'Failed to initiate Google sign in.' });
			setIsSocialPending(false);
		}
	}

	return (
		<form
			className={cn('flex flex-col gap-6', className)}
			{...props}
			onSubmit={handleSubmit(handleSignUp)}
		>
			<FieldGroup className="gap-3">
				<div className="font-clash-display flex flex-col items-center gap-1 text-center">
					<h1 className="text-2xl font-bold">Create your account</h1>
					<p className="text-muted-foreground text-sm font-medium text-balance">
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
						aria-describedby={errors.name ? 'name-error' : undefined}
						{...register('name')}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="email">Email</FieldLabel>
					<Input
						id="email"
						type="email"
						placeholder="m@example.com"
						required
						aria-invalid={!!errors.email}
						aria-describedby={errors.email ? 'email-error' : undefined}
						{...register('email')}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="password">Password</FieldLabel>
					<Input
						id="password"
						type="password"
						placeholder="********"
						required
						aria-invalid={!!errors.password}
						aria-describedby={errors.password ? 'password-error' : undefined}
						{...register('password')}
					/>
				</Field>
				{errors.root && (
					<div className="text-sm text-red-600">{errors.root.message}</div>
				)}
				<Field className="mt-4">
					<Button type="submit" disabled={isPending}>
						{isPending ? 'Creating account...' : 'Sign Up'}
					</Button>
				</Field>
				<FieldSeparator className="my-1">
					or do it via other accounts
				</FieldSeparator>
				<Field className="flex flex-col gap-4">
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
						Already have an account?{' '}
						<Link href="/sign-in" className="underline underline-offset-4">
							Sign in
						</Link>
					</FieldDescription>
				</Field>
			</FieldGroup>
		</form>
	);
}
