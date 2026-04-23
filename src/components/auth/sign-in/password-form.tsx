'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type ComponentProps } from 'react';
import { useForm } from 'react-hook-form';

import { LogoIcon } from '@/assets/logo-icon';
import { SIGN_IN_CARD_CLASS } from '@/components/auth/sign-in/constants';
import { getSignInErrorMessage } from '@/components/auth/sign-in/error-messages';
import { SignInFooter } from '@/components/auth/sign-in/footer';
import {
	passwordSignInFormSchema,
	type PasswordSignInFormValues,
} from '@/components/auth/sign-in/schema';
import { Button } from '@/components/ui/button';
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { cn } from '@/lib/class-names';
import { signInUser } from '@/services/auth/sign-in-user';

export interface PasswordSignInFormProps extends ComponentProps<'form'> {
	returnTo: string;
	onSwitchToMagicLink: () => void;
	onGoogleSignIn: () => void;
	isSocialPending: boolean;
	socialError: string | null;
}

/** Email + password sign-in form with forgot-password and magic-link toggle */
export function PasswordSignInForm({
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
	} = useForm<PasswordSignInFormValues>({
		resolver: zodResolver(passwordSignInFormSchema),
	});
	const [isPending, startTransition] = useTransition();
	const [hasLoginError, setHasLoginError] = useState(false);
	const router = useRouter();

	/** Authenticates with email/password via server action */
	async function handleSignIn(data: PasswordSignInFormValues) {
		clearErrors('root');
		setHasLoginError(false);

		startTransition(async () => {
			const result = await signInUser(data);

			if (!result.success) {
				setError('root', { message: getSignInErrorMessage(result.error) });
				setHasLoginError(true);
				return;
			}

			router.push(returnTo);
			router.refresh();
		});
	}

	const isDisabled = isPending || isSocialPending;

	return (
		<form
			className={cn(SIGN_IN_CARD_CLASS, className)}
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
