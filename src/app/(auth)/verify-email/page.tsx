import Link from 'next/link';
import { Suspense } from 'react';

import { VerifyEmailHandler } from './verify-email-handler';

interface VerifyEmailPageProps {
	searchParams: Promise<{ token?: string }>;
}

/**
 * Email Verification Page
 *
 * Receives the token from the verification email link,
 * calls the backend to verify, and auto-signs in the user.
 */
export default async function VerifyEmailPage({
	searchParams,
}: VerifyEmailPageProps) {
	const { token } = await searchParams;

	if (!token) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="flex flex-col items-center gap-4 text-center">
					<p className="text-red-600">
						Invalid verification link. No token provided.
					</p>
					<div className="flex gap-3">
						<Link
							href="/auth/resend-verification"
							className="text-black underline"
						>
							Resend Verification Email
						</Link>
						<Link href="/sign-in" className="text-black underline">
							Go to Sign In
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center">
			<Suspense fallback={<VerifyEmailLoading />}>
				<VerifyEmailHandler token={token} />
			</Suspense>
		</div>
	);
}

function VerifyEmailLoading() {
	return (
		<div className="flex flex-col items-center gap-4">
			<div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
			<p className="text-muted-foreground">Verifying your email...</p>
		</div>
	);
}
