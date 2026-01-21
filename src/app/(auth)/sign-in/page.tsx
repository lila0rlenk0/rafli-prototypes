import { Suspense } from 'react';

import { Spinner } from '@/components/ui/spinner';
import { SignInForm } from './sign-in-form';

/**
 * Sign In Page
 *
 * Displays the sign-in form with support for email/password and Google OAuth.
 * Wraps the form in Suspense because it uses useSearchParams for returnTo handling.
 */
export default function LoginPage() {
	return (
		<div className="grid min-h-svh lg:grid-cols-2">
			<div className="bg-muted relative hidden lg:block">
				<div className="absolute inset-0 size-125 h-full w-full bg-[#B9AF86] object-cover dark:brightness-[0.2] dark:grayscale" />
			</div>
			<div className="flex flex-col gap-4 p-6 md:p-10">
				<div className="flex flex-1 items-center justify-center">
					<div className="w-full max-w-xs">
						<Suspense
							// TODO: Create a skeleton loader instead of a spinner
							fallback={
								<div className="flex items-center justify-center">
									<Spinner />
								</div>
							}
						>
							<SignInForm />
						</Suspense>
					</div>
				</div>
			</div>
		</div>
	);
}
