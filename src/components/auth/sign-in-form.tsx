'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, useTransition, type ComponentProps } from 'react';
import { useForm } from 'react-hook-form';
import { FaGoogle } from 'react-icons/fa';
import { z } from 'zod';

import { LogoIcon } from '@/assets/logo-icon';
import { Button } from '@/components/ui/button';
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { buildOAuthCallbackUrl } from '@/lib/auth/build-oauth-callback-url';
import { cn } from '@/lib/utils';
import { validateReturnTo } from '@/lib/utils/validate-return-to';
import { sendMagicLink } from '@/services/auth/magic-link';
import { signInUser } from '@/services/auth/sign-in-user';
import { initiateSocialSignIn } from '@/services/auth/social-sign-in';
import {
	AUTH_ERROR_CODES,
	COMMON_ERROR_CODES,
	type AuthErrorCode,
} from '@/types/errors';

// === Schemas ===

/** Email + password schema for traditional sign-in */
const passwordFormSchema = z.object({
	email: z.email('Invalid email address'),
	password: z
		.string()
		.min(12, 'Password must be at least 12 characters')
		.max(128),
});

/** Email-only schema for magic link sign-in */
const magicLinkEmailSchema = z.object({
	email: z.email('Invalid email address'),
});

type PasswordFormType = z.infer<typeof passwordFormSchema>;
type MagicLinkEmailFormType = z.infer<typeof magicLinkEmailSchema>;

/** Shared card container class — reused by all three sign-in mode components */
const CARD_CLASS =
	'flex w-full max-w-md flex-col rounded-2xl border border-black bg-white px-8 py-10 lg:px-12 lg:py-12';

/**
 * Maps auth and infrastructure error codes to user-friendly messages.
 * Covers credential errors, social login failures, and common infrastructure issues.
 */
function getErrorMessage(errorCode: AuthErrorCode): string {
	switch (errorCode) {
		case AUTH_ERROR_CODES.INVALID_CREDENTIALS:
			return 'Invalid email or password.';
		case AUTH_ERROR_CODES.TOKEN_EXPIRED:
			return 'Your session has expired.';
		case AUTH_ERROR_CODES.INVALID_TOKEN:
			return 'Invalid or expired link. Please try again.';
		case AUTH_ERROR_CODES.SOCIAL_LOGIN_FAILED:
		case AUTH_ERROR_CODES.SOCIAL_PROVIDER_ERROR:
		case AUTH_ERROR_CODES.SOCIAL_CALLBACK_FAILED:
		case AUTH_ERROR_CODES.SOCIAL_TOKEN_EXCHANGE_FAILED:
			return 'Google sign in failed. Please try again.';
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

// === Sign-In Form ===

/** Tracks which sign-in UI step is currently visible */
type SignInMode = 'password' | 'magic-link-email' | 'magic-link-sent';

/**
 * Root sign-in form orchestrator — manages mode switching between magic link,
 * password, and "link sent" confirmation steps.
 *
 * 'use client' required: uses useSearchParams, useState, useMemo, useRouter.
 * Google OAuth handler is lifted here to share across both input modes.
 *
 * @returns The currently active sign-in step component
 */
export function SignInForm({ className, ...props }: ComponentProps<'form'>) {
	// Magic link is the primary sign-in method — password is the fallback
	const [mode, setMode] = useState<SignInMode>('magic-link-email');
	const [magicLinkEmail, setMagicLinkEmail] = useState('');
	const [isSocialPending, setIsSocialPending] = useState(false);
	const [socialError, setSocialError] = useState<string | null>(null);
	const searchParams = useSearchParams();
	// useMemo: avoid re-running validateReturnTo on every render — searchParams
	// only changes on URL navigation, so this effectively caches the validated path.
	const returnTo = useMemo(
		() => validateReturnTo(searchParams.get('returnTo')),
		[searchParams],
	);

	/**
	 * Shared across both sign-in modes — lifted here to avoid duplication.
	 * Initiates Google OAuth flow via server action and redirects to Google's consent screen.
	 */
	async function handleGoogleSignIn() {
		setIsSocialPending(true);
		setSocialError(null);

		// Step 1: Call server action to get the Google OAuth URL
		const result = await initiateSocialSignIn({
			provider: 'google',
			callbackURL: buildOAuthCallbackUrl(window.location.origin, returnTo),
		});

		// Step 2: Surface error if the server action failed
		if (!result.success) {
			setSocialError(getErrorMessage(result.error));
			setIsSocialPending(false);
			return;
		}

		// Step 3: Full-page redirect to Google's OAuth consent screen.
		// We use window.location.href (not router.push) because this is a cross-origin redirect.
		window.location.href = result.data.url;
	}

	/** Transitions to "link sent" confirmation after magic link is dispatched */
	function handleMagicLinkSent(email: string) {
		setMagicLinkEmail(email);
		setMode('magic-link-sent');
	}

	/** Switches to password form, clearing any prior social auth errors */
	function handleSwitchToPassword() {
		setMode('password');
		setSocialError(null);
	}

	/** Switches to magic link form, resetting email and social errors */
	function handleSwitchToMagicLink() {
		setMode('magic-link-email');
		setMagicLinkEmail('');
		setSocialError(null);
	}

	/** Returns to the magic link email input from the "link sent" step */
	function handleBackToMagicLink() {
		setMode('magic-link-email');
		setMagicLinkEmail('');
	}

	if (mode === 'magic-link-email') {
		return (
			<MagicLinkEmailStep
				className={className}
				returnTo={returnTo}
				onLinkSent={handleMagicLinkSent}
				onSwitchToPassword={handleSwitchToPassword}
				onGoogleSignIn={handleGoogleSignIn}
				isSocialPending={isSocialPending}
				socialError={socialError}
				{...props}
			/>
		);
	}

	if (mode === 'password') {
		return (
			<PasswordSignInForm
				className={className}
				returnTo={returnTo}
				onSwitchToMagicLink={handleSwitchToMagicLink}
				onGoogleSignIn={handleGoogleSignIn}
				isSocialPending={isSocialPending}
				socialError={socialError}
				{...props}
			/>
		);
	}

	return (
		<MagicLinkSentStep
			className={className}
			email={magicLinkEmail}
			returnTo={returnTo}
			onBack={handleBackToMagicLink}
		/>
	);
}

// === Password Sign-In Form — traditional email + password sign-in ===

interface PasswordSignInFormProps extends ComponentProps<'form'> {
	returnTo: string;
	onSwitchToMagicLink: () => void;
	onGoogleSignIn: () => void;
	isSocialPending: boolean;
	socialError: string | null;
}

/** Email + password sign-in form with forgot-password and magic-link toggle */
function PasswordSignInForm({
	className,
	returnTo,
	onSwitchToMagicLink,
	onGoogleSignIn,
	isSocialPending,
	socialError,
	...props
}: PasswordSignInFormProps) {
	const {
		register,
		handleSubmit,
		formState: { errors },
		setError,
		clearErrors,
	} = useForm<PasswordFormType>({
		resolver: zodResolver(passwordFormSchema),
	});
	const [isPending, startTransition] = useTransition();
	const [hasLoginError, setHasLoginError] = useState(false);
	const router = useRouter();

	/** Authenticates with email/password via server action */
	async function handleSignIn(data: PasswordFormType) {
		clearErrors('root');
		setHasLoginError(false);

		startTransition(async () => {
			// Step 1: Call signInUser server action — sets auth cookies on success
			const result = await signInUser(data);

			// Step 2: Show error with "just signed up?" hint for unverified accounts
			if (!result.success) {
				setError('root', { message: getErrorMessage(result.error) });
				// hasLoginError drives the "check your inbox" hint below the error
				setHasLoginError(true);
				return;
			}

			// Step 3: Redirect to the validated returnTo path and refresh server state
			router.push(returnTo);
			router.refresh();
		});
	}

	const isDisabled = isPending || isSocialPending;

	return (
		<form
			className={cn(CARD_CLASS, className)}
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
				<button
					type="button"
					onClick={onSwitchToMagicLink}
					disabled={isDisabled}
					className="text-muted-foreground w-fit text-sm underline-offset-4 hover:underline"
				>
					Login with a magic link
				</button>
				<FieldError errors={[errors.root]} />
				{socialError ? (
					<p className="text-destructive text-sm">{socialError}</p>
				) : null}
				{hasLoginError ? (
					<p className="text-muted-foreground text-xs">
						Just signed up? Check your inbox for the verification email.{' '}
						<Link
							href="/auth/resend-verification"
							className="text-black underline"
						>
							Resend it
						</Link>
					</p>
				) : null}
				<Field className="mt-4">
					<Button
						type="submit"
						disabled={isDisabled}
						className="font-clash-display px-6 py-4 text-lg font-semibold"
					>
						{isPending ? 'Signing in...' : 'Sign In'}
					</Button>
				</Field>
				<SignInFooter
					returnTo={returnTo}
					onGoogleSignIn={onGoogleSignIn}
					isSocialPending={isSocialPending}
				/>
			</FieldGroup>
		</form>
	);
}

// === Magic Link Email Step — primary sign-in method, email-only ===

interface MagicLinkEmailStepProps extends ComponentProps<'form'> {
	returnTo: string;
	onLinkSent: (email: string) => void;
	onSwitchToPassword: () => void;
	onGoogleSignIn: () => void;
	isSocialPending: boolean;
	socialError: string | null;
}

/** Email input step that sends a magic link — primary sign-in method */
function MagicLinkEmailStep({
	className,
	returnTo,
	onLinkSent,
	onSwitchToPassword,
	onGoogleSignIn,
	isSocialPending,
	socialError,
	...props
}: MagicLinkEmailStepProps) {
	const {
		register,
		handleSubmit,
		formState: { errors },
		setError,
		clearErrors,
	} = useForm<MagicLinkEmailFormType>({
		resolver: zodResolver(magicLinkEmailSchema),
	});
	const [isPending, setIsPending] = useState(false);

	/** Sends magic link via server action and transitions to "link sent" step */
	async function handleSendLink(data: MagicLinkEmailFormType) {
		setIsPending(true);
		clearErrors('root');

		// Step 1: Build callback URL — magic link reuses the OAuth callback page.
		// After clicking the link, Better-Auth sets a session cookie and redirects
		// to /auth/callback, which exchanges it for a JWT.
		const callbackURL = buildOAuthCallbackUrl(window.location.origin, returnTo);

		// Step 2: Call server action to send the magic link email
		const result = await sendMagicLink(data.email, callbackURL);

		// Step 3: Surface error or transition to "check your email" step
		if (!result.success) {
			setError('root', { message: getErrorMessage(result.error) });
			setIsPending(false);
			return;
		}

		onLinkSent(data.email);
	}

	const isDisabled = isPending || isSocialPending;

	return (
		<form
			className={cn(CARD_CLASS, className)}
			{...props}
			onSubmit={handleSubmit(handleSendLink)}
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
					<FieldLabel htmlFor="magic-link-email">Enter your email</FieldLabel>
					<Input
						id="magic-link-email"
						type="email"
						placeholder="Type your email"
						required
						autoFocus
						aria-invalid={!!errors.email}
						{...register('email')}
					/>
					<FieldError errors={[errors.email]} />
				</Field>
				<button
					type="button"
					onClick={onSwitchToPassword}
					disabled={isDisabled}
					className="text-muted-foreground w-fit text-sm underline-offset-4 hover:underline"
				>
					Login with a password
				</button>
				<FieldError errors={[errors.root]} />
				{socialError ? (
					<p className="text-destructive text-sm">{socialError}</p>
				) : null}
				<Field className="mt-4">
					<Button
						type="submit"
						disabled={isDisabled}
						className="font-clash-display px-6 py-4 text-lg font-semibold"
					>
						{isPending ? 'Sending...' : 'Sign In'}
					</Button>
				</Field>
				<SignInFooter
					returnTo={returnTo}
					onGoogleSignIn={onGoogleSignIn}
					isSocialPending={isSocialPending}
				/>
			</FieldGroup>
		</form>
	);
}

// === Shared Footer (Google OAuth + Sign Up link) ===

interface SignInFooterProps {
	returnTo: string;
	onGoogleSignIn: () => void;
	isSocialPending: boolean;
}

/** Google OAuth button + "Don't have an account? Sign Up" — shared by both sign-in modes. */
function SignInFooter({
	returnTo,
	onGoogleSignIn,
	isSocialPending,
}: SignInFooterProps) {
	return (
		<Field className="flex flex-col space-y-4">
			<div className="flex w-full items-center justify-center gap-3">
				<Button
					variant="outline"
					type="button"
					className="size-12! w-fit bg-white/95"
					onClick={onGoogleSignIn}
					disabled={isSocialPending}
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
				<Link
					href={`/sign-up?returnTo=${encodeURIComponent(returnTo)}`}
					className="font-semibold text-black"
				>
					Sign Up
				</Link>
			</FieldDescription>
			<FieldDescription className="text-center">
				Haven&apos;t verified your account?{' '}
				<Link
					href="/auth/resend-verification"
					className="font-semibold text-black"
				>
					Resend verification
				</Link>
			</FieldDescription>
		</Field>
	);
}

// === Magic Link Sent Step ===

interface MagicLinkSentStepProps extends ComponentProps<'div'> {
	email: string;
	returnTo: string;
	onBack: () => void;
}

function MagicLinkSentStep({
	className,
	email,
	returnTo,
	onBack,
	...props
}: MagicLinkSentStepProps) {
	const [isResending, setIsResending] = useState(false);
	const [resendStatus, setResendStatus] = useState<'idle' | 'sent' | 'error'>(
		'idle',
	);

	/** Resends the magic link to the same email address */
	async function handleResend() {
		setIsResending(true);
		setResendStatus('idle');

		// Reuse the same OAuth callback URL — magic link and OAuth share the callback page
		const callbackURL = buildOAuthCallbackUrl(window.location.origin, returnTo);
		const result = await sendMagicLink(email, callbackURL);

		setIsResending(false);
		setResendStatus(result.success ? 'sent' : 'error');
	}

	/** Maps resend state to button label — extracted to avoid nested ternary in JSX */
	function getResendLabel(): string {
		if (isResending) return 'Sending...';

		switch (resendStatus) {
			case 'sent':
				return 'Link resent!';
			case 'error':
				return 'Failed to resend. Try again';
			case 'idle':
				return "Didn't get the email? Resend";
		}
	}

	return (
		<div className={cn(CARD_CLASS, className)} {...props}>
			<div className="mx-auto flex h-fit w-full max-w-80 flex-col items-center gap-4">
				<LogoIcon className="mx-auto" />

				<div className="my-6 flex flex-col items-center gap-1 text-center">
					<h1 className="font-clash-display line text-4xl font-semibold">
						Check your email
					</h1>
					<p className="text-muted-foreground">
						We sent a sign-in link to{' '}
						<span className="font-medium text-black">{email}</span>
					</p>
				</div>

				<p className="text-muted-foreground text-sm">
					Click the link in the email to sign in. You can close this tab.
				</p>

				<div className="mt-2 flex flex-col items-center gap-1">
					<button
						type="button"
						onClick={handleResend}
						disabled={isResending}
						className="text-muted-foreground text-sm underline-offset-4 hover:underline"
					>
						{getResendLabel()}
					</button>
					<button
						type="button"
						onClick={onBack}
						className="text-sm text-black underline-offset-4 hover:underline"
					>
						Use a different email
					</button>
				</div>
			</div>
		</div>
	);
}
