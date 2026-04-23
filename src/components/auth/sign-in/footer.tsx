'use client';

import { Loader } from 'lucide-react';
import Link from 'next/link';
import { FaGoogle } from 'react-icons/fa';

import { Button } from '@/components/ui/button';
import { Field, FieldDescription } from '@/components/ui/field';

export interface SignInFooterProps {
	returnTo: string;
	onGoogleSignIn: () => void;
	isSocialPending: boolean;
}

/** Google OAuth button + "Don't have an account? Sign Up" — shared by both sign-in modes. */
export function SignInFooter({
	returnTo,
	onGoogleSignIn,
	isSocialPending,
}: SignInFooterProps) {
	return (
		<Field className="flex flex-col gap-4">
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
