import { FileCheck2, Lock, Search, Sigma } from 'lucide-react';

import { PreviewChip } from '@/components/landing/how-it-works/preview-chip';
import { TicketVerificationStory } from '@/components/verification/story/ticket-verification-story';

/**
 * Verify-yourself section — three preview chips describing what the
 * user will see after submitting, followed by the interactive
 * `<TicketVerificationStory />` island. Chips set expectations before
 * typing so the result screen doesn't surprise the user.
 */
export function HowItWorksVerifySection() {
	return (
		<section className="mb-16">
			<h2 className="font-clash-display mb-2 flex items-center gap-2 text-2xl font-semibold">
				<Search className="size-6" />
				Verify your entry
			</h2>
			<p className="text-muted-foreground mb-6">
				Enter your sweepstakes ID and entry code. Here&apos;s what you&apos;ll
				see.
			</p>

			<div className="mb-6 grid gap-3 sm:grid-cols-3">
				<PreviewChip
					icon={<FileCheck2 className="size-5" />}
					title="Found"
					body="Your entry inside the frozen IPFS dataset."
				/>
				<PreviewChip
					icon={<Lock className="size-5" />}
					title="Proved"
					body="Cryptographic proof it was committed before the draw."
				/>
				<PreviewChip
					icon={<Sigma className="size-5" />}
					title="Computed"
					body="The random number and formula that picked the winner."
				/>
			</div>

			<div className="bg-card rounded-xl border p-6">
				<TicketVerificationStory />
			</div>
		</section>
	);
}
