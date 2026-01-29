import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { getUpdates } from '@/services/update/get-updates';
import type { Update } from '@/types/update';
import { MegaphoneIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { UpdateTimelineItem } from './update-timeline-item';

interface RaffleUpdatesCardProps {
	raffleId: string;
	/** Optional action slot rendered to the left of the accordion arrow */
	actionSlot?: ReactNode;
}

/**
 * RaffleUpdatesCard Component
 *
 * Server component that displays updates from the host in an accordion.
 * Shows a timeline of updates (newest first) when expanded.
 * Shows empty state if no updates exist.
 *
 * @param raffleId - The ID of the raffle to fetch updates for
 * @param actionSlot - Optional action element (e.g., Add update button)
 */
export async function RaffleUpdatesCard({
	raffleId,
	actionSlot,
}: RaffleUpdatesCardProps) {
	const response = await getUpdates(raffleId);

	const updates: Update[] = response.success ? response.data.items : [];
	const hasUpdates = updates.length > 0;

	return (
		<div className="w-full overflow-hidden rounded-2xl bg-white">
			<Accordion type="single" collapsible className="w-full">
				<AccordionItem value="updates" className="border-none">
					<AccordionTrigger className="px-6 py-4 hover:no-underline">
						<div className="flex flex-1 items-center justify-between">
							<div className="flex items-center gap-3">
								<h2 className="font-clash-display text-3xl font-semibold">
									Updates from the host
								</h2>
								{hasUpdates && (
									<span className="rounded-full bg-black px-2 py-0.5 text-xs text-white">
										{updates.length}
									</span>
								)}
							</div>
							{actionSlot}
						</div>
					</AccordionTrigger>
					<AccordionContent className="px-6 pb-6">
						{hasUpdates ? (
							<div className="pt-2">
								{updates.map((update, index) => (
									<div key={update.id}>
										<UpdateTimelineItem update={update} />
										{index < updates.length - 1 && (
											<div className="mb-6 h-px w-full bg-[#e5e5e5]" />
										)}
									</div>
								))}
							</div>
						) : (
							<div className="flex flex-col items-center justify-center py-8 text-center">
								<MegaphoneIcon className="mb-3 size-8 text-gray-300" />
								<p className="text-sm text-gray-500">No updates yet</p>
								<p className="text-xs text-gray-400">
									The host hasn&apos;t posted any updates for this raffle.
								</p>
							</div>
						)}
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		</div>
	);
}
