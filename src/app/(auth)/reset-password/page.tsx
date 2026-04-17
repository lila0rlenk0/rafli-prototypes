import Link from 'next/link';

import { LogoIcon } from '@/assets/logo-icon';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';

interface ResetPasswordPageProps {
	searchParams: Promise<{ token?: string }>;
}

/**
 * Reset Password Page
 *
 * Async Server Component — awaits searchParams to extract the reset token.
 * Data flow: token is extracted server-side and passed as prop to the Client
 * Component ResetPasswordForm, which calls the resetPassword server action.
 *
 * Guard: missing token renders an error with a link to request a new one.
 * The token itself is NOT validated here — that happens in the server action
 * to avoid exposing timing information.
 *
 * @returns AuthPageShell with either error UI or reset password form
 */
export default async function ResetPasswordPage({
	searchParams,
}: ResetPasswordPageProps) {
	const { token } = await searchParams;

	// Guard: no token — invalid or manually truncated reset link
	if (!token) {
		return (
			<AuthPageShell>
				<div className="flex w-full max-w-md flex-col rounded-2xl border border-black bg-white px-8 py-10 lg:px-12 lg:py-12">
					<FieldGroup className="mx-auto h-fit w-full max-w-80">
						<LogoIcon className="mx-auto" />
						<div className="my-6 flex flex-col items-center gap-1 text-center">
							<h1 className="font-clash-display text-4xl font-semibold">
								Invalid reset link
							</h1>
							<p className="text-muted-foreground">
								This password reset link is invalid or has expired.
							</p>
						</div>
						<Button
							asChild
							className="font-clash-display px-6 py-4 text-lg font-semibold"
						>
							<Link href="/forgot-password">Request new link</Link>
						</Button>
					</FieldGroup>
				</div>
			</AuthPageShell>
		);
	}

	return (
		<AuthPageShell>
			<ResetPasswordForm token={token} />
		</AuthPageShell>
	);
}
