import { Button } from '@/components/ui/button';
import { CheckCircle, Mail } from 'lucide-react';
import Link from 'next/link';

/**
 * Success screen displayed after successful verification submission.
 * Informs the user about next steps (confirmation email + review process).
 *
 * @returns Full-page success state replacing the form
 */
export function SuccessScreen() {
	return (
		<div className="flex w-full flex-col items-center justify-center py-16">
			<div className="flex max-w-md flex-col items-center gap-6 text-center">
				<div className="flex size-20 items-center justify-center rounded-full bg-emerald-50">
					<CheckCircle className="size-10 text-emerald-600" />
				</div>

				<div className="flex flex-col gap-2">
					<h1 className="font-clash-display text-3xl font-semibold">
						Submission Received
					</h1>
					<p className="text-muted-foreground text-base">
						Your verification request has been submitted successfully. Our team
						will review your information.
					</p>
				</div>

				<div className="flex w-full flex-col gap-3 rounded-xl border border-dashed p-5">
					<div className="flex items-start gap-3">
						<Mail className="mt-0.5 size-5 shrink-0 text-black" />
						<div className="flex flex-col gap-1 text-left">
							<p className="text-sm font-medium">Confirmation email</p>
							<p className="text-muted-foreground text-sm">
								You will receive a confirmation email shortly with details of
								your submission.
							</p>
						</div>
					</div>

					<div className="flex items-start gap-3">
						<CheckCircle className="mt-0.5 size-5 shrink-0 text-black" />
						<div className="flex flex-col gap-1 text-left">
							<p className="text-sm font-medium">Review process</p>
							<p className="text-muted-foreground text-sm">
								Once our team completes the analysis, you will receive another
								email with the outcome of your verification.
							</p>
						</div>
					</div>
				</div>

				<div className="flex w-full flex-col gap-3 pt-2">
					<Button asChild className="w-full">
						<Link href="/browse">Back to Browse</Link>
					</Button>
					<Button asChild variant="outline" className="w-full">
						<Link href="/my-raffles">Go to My Sweepstakes</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}
