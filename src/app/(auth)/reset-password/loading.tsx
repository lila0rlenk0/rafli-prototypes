import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading State for Reset Password Page
 *
 * Next.js loading.tsx — shown as instant fallback while the async ResetPasswordPage
 * awaits searchParams. Displays a skeleton that approximates the reset form layout.
 *
 * Note: the skeleton layout here mirrors the form structure (title, description,
 * two password fields, submit button) but uses the legacy grid layout rather than
 * AuthPageShell. This is acceptable because the skeleton is visible for <100ms
 * while searchParams resolve.
 *
 * @returns Skeleton placeholder for the reset password page
 */
export default function Loading() {
	return (
		<div className="grid min-h-svh lg:grid-cols-2">
			<div className="bg-muted relative hidden lg:block">
				<div className="bg-sand dark:brightness-soft absolute inset-0 size-125 h-full w-full object-cover dark:grayscale" />
			</div>
			<div className="flex flex-col gap-4 p-6 md:p-10">
				<div className="flex flex-1 items-center justify-center">
					<div className="w-full max-w-xs">
						<div className="flex flex-col gap-6">
							<div className="font-clash-display flex flex-col items-center gap-1 text-center">
								<Skeleton className="h-8 w-48" />
								<Skeleton className="mt-2 h-4 w-64" />
							</div>
							<div className="flex flex-col gap-3">
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
							</div>
							<Skeleton className="h-10 w-full" />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
