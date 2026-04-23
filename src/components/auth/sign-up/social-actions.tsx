'use client';

import { Loader, Mail } from 'lucide-react';
import Link from 'next/link';
import { FaGoogle } from 'react-icons/fa';

import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldSeparator } from '@/components/ui/field';

interface SignUpSocialActionsProps {
	returnTo: string;
	isPending: boolean;
	isSocialPending: boolean;
	onGoogleSignIn: () => void;
}

/**
 * "Or do it via other accounts" panel — Google OAuth, magic-link link,
 * and the "already have an account?" footer. Extracted so the form shell
 * stays focused on RHF wiring and the submit flow.
 */
export function SignUpSocialActions({
	returnTo,
	isPending,
	isSocialPending,
	onGoogleSignIn,
}: SignUpSocialActionsProps) {
	const signInHref = `/sign-in?returnTo=${encodeURIComponent(returnTo)}`;
	return (
		<>
			<FieldSeparator className="my-1">
				or do it via other accounts
			</FieldSeparator>
			<Field className="flex flex-col gap-4">
				<div className="flex w-full items-center justify-center gap-3">
					<Button
						variant="outline"
						type="button"
						className="size-12! w-fit bg-white/95"
						onClick={onGoogleSignIn}
						disabled={isPending || isSocialPending}
					>
						{isSocialPending ? (
							<Loader className="animate-spin" />
						) : (
							<FaGoogle className="size-6" />
						)}
						<span className="sr-only">Login with Google</span>
					</Button>
					<Button
						variant="outline"
						type="button"
						className="size-12! w-fit bg-white/95"
						asChild
					>
						<Link href={signInHref}>
							<Mail className="size-6" />
							<span className="sr-only">Sign in with magic link</span>
						</Link>
					</Button>
				</div>
				<FieldDescription className="text-center">
					Already have an account?{' '}
					<Link href={signInHref} className="text-black">
						Sign in
					</Link>
				</FieldDescription>
			</Field>
		</>
	);
}
