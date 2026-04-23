import Link from 'next/link';
import { Suspense } from 'react';

import { VerifyEmailFlow } from '@/components/auth/email/verify-email-flow';

interface VerifyEmailPageProps {
	searchParams: Promise<{ token?: string }>;
}

/**
 * Email Verification Page
 *
 * Async Server Component — awaits searchParams to extract the verification token.
 * Does NOT use the AuthPageShell (minimal centered layout for single-purpose flow).
 *
 * Data flow: searchParams.token is passed as a prop to the Client Component
 * VerifyEmailFlow, which performs the actual verification via server action.
 *
 * Guard: missing token renders an error with resend/sign-in links immediately
 * (no spinner, no Suspense needed for the error case).
 *
 * @returns Centered layout with either error links or Suspense-wrapped handler
 */
export default async function VerifyEmailPage({
	searchParams,
}: VerifyEmailPageProps) {
	const { token } = await searchParams;

	// Guard: no token in URL — invalid or manually truncated verification link
	if (!token) {
		return (
			<div className="flex min-h-dvh items-center justify-center">
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
		<div className="flex min-h-dvh items-center justify-center">
			{/* Suspense fallback: spinner while VerifyEmailFlow client bundle loads */}
			<Suspense fallback={<VerifyEmailLoading />}>
				<VerifyEmailFlow token={token} />
			</Suspense>
		</div>
	);
}

/** Spinner shown while the VerifyEmailFlow client JS bundle is loading */
function VerifyEmailLoading() {
	return (
		<div className="flex flex-col items-center gap-4">
			<div className="border-primary size-8 animate-spin rounded-full border-4 border-t-transparent" />
			<p className="text-muted-foreground">Verifying your email...</p>
		</div>
	);
}
