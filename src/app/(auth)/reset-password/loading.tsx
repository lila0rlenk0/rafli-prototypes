import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading State for Reset Password Page
 *
 * Displays a skeleton loading UI that matches the structure of the ResetPasswordPage.
 */
export default function Loading() {
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
