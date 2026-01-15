import Link from 'next/link';

import { Button } from '@/components/ui/button';

import { ResetPasswordForm } from './reset-password-form';

interface ResetPasswordPageProps {
	searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
	const { token } = await searchParams;

	if (!token) {
		return (
			<div className="grid min-h-svh lg:grid-cols-2">
				<div className="bg-muted relative hidden lg:block">
					<div className="absolute inset-0 size-[500px] h-full w-full bg-[#B9AF86] object-cover dark:brightness-[0.2] dark:grayscale" />
				</div>
				<div className="flex flex-col gap-4 p-6 md:p-10">
					<div className="flex flex-1 items-center justify-center">
						<div className="w-full max-w-xs">
							<div className="flex flex-col gap-6">
								<div className="font-clash-display flex flex-col items-center gap-1 text-center">
									<h1 className="text-2xl font-bold">Invalid reset link</h1>
									<p className="text-muted-foreground text-sm font-medium text-balance">
										This password reset link is invalid or has expired.
									</p>
								</div>
								<Button asChild>
									<Link href="/forgot-password">Request new link</Link>
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="grid min-h-svh lg:grid-cols-2">
			<div className="bg-muted relative hidden lg:block">
				<div className="absolute inset-0 size-[500px] h-full w-full bg-[#B9AF86] object-cover dark:brightness-[0.2] dark:grayscale" />
			</div>
			<div className="flex flex-col gap-4 p-6 md:p-10">
				<div className="flex flex-1 items-center justify-center">
					<div className="w-full max-w-xs">
						<ResetPasswordForm token={token} />
					</div>
				</div>
			</div>
		</div>
	);
}
