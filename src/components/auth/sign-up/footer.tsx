'use client';

import { Loader } from 'lucide-react';
import Link from 'next/link';
import { FaGoogle } from 'react-icons/fa';

import { Button } from '@/components/ui/button';
import { Field, FieldDescription } from '@/components/ui/field';

export interface SignUpFooterProps {
	returnTo: string;
	onGoogleSignIn: () => void;
	isSocialPending: boolean;
}

/** Google OAuth button + "Already have an account? Sign in" — shared by both sign-up modes. */
export function SignUpFooter({
	returnTo,
	onGoogleSignIn,
	isSocialPending,
}: SignUpFooterProps) {
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
					<span className="sr-only">Sign up with Google</span>
				</Button>
			</div>
			<FieldDescription className="text-center">
				Already have an account?{' '}
				<Link
					href={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`}
					className="font-semibold text-black"
				>
					Sign in
				</Link>
			</FieldDescription>
		</Field>
	);
}
