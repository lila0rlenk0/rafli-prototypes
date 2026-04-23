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
import { UpdateTimelineItem } from '@/components/raffle/update-timeline-item';

interface RaffleUpdatesCardProps {
	raffleId: string;
	/** Host name from raffle, used as fallback when update host returns Unknown */
	hostName?: string;
	/** Optional action slot rendered to the left of the accordion arrow */
	actionSlot?: ReactNode;
}

/**
 * Server component — fetches and displays host updates in a collapsible accordion.
 */
export async function RaffleUpdatesCard({
	raffleId,
	hostName,
	actionSlot,
}: RaffleUpdatesCardProps) {
	const response = await getUpdates(raffleId);

	const updates: Update[] = response.success ? response.data.items : [];
	const hasUpdates = updates.length > 0;

	return (
		<div className="w-full overflow-hidden rounded-2xl bg-white">
			<Accordion type="single" collapsible className="w-full">
				<AccordionItem value="updates" className="border-none">
					<AccordionTrigger className="px-8 py-4 hover:no-underline">
						<div className="flex flex-1 items-center justify-between">
							<div className="flex items-center gap-3">
								<h3 className="font-clash-display text-3xl font-semibold">
									Updates from the host
								</h3>
								{hasUpdates ? (
									<span className="rounded-full bg-black px-2 py-0.5 text-xs text-white">
										{updates.length}
									</span>
								) : null}
							</div>
							{actionSlot}
						</div>
					</AccordionTrigger>
					<AccordionContent className="px-8 pb-8">
						{hasUpdates ? (
							<div className="pt-2">
								{updates.map((update, index) => (
									<div key={update.id}>
										<UpdateTimelineItem update={update} hostName={hostName} />
										{index < updates.length - 1 ? (
											<div className="bg-ink-200 mb-6 h-px w-full" />
										) : null}
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
