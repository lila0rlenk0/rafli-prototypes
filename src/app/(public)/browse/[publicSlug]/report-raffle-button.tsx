'use client';

import { FlagIcon } from 'lucide-react';
import { useState } from 'react';

import { ReportContentModal } from '@/components/report/report-content-modal';
import { Button } from '@/components/ui/button';

interface ReportRaffleButtonProps {
	/** The raffle ID to report */
	raffleId: string;
}

/**
 * Ghost button with flag icon to report a raffle.
 * Rendered next to the raffle title for authenticated non-owner users.
 *
 * @param props - Button props
 * @param props.raffleId - The raffle ID to report
 */
export function ReportRaffleButton({ raffleId }: ReportRaffleButtonProps) {
	const [open, setOpen] = useState(false);

	return (
		<>
			<Button
				variant="ghost"
				size="icon"
				onClick={function openReportModal() {
					setOpen(true);
				}}
				className="shrink-0 text-gray-400 hover:text-gray-600"
				aria-label="Report raffle"
			>
				<FlagIcon className="size-4" />
			</Button>
			{/* raffleId omitted — only required for child content types (comment, review, chat) */}
			<ReportContentModal
				contentType="raffle"
				contentId={raffleId}
				open={open}
				onOpenChange={setOpen}
			/>
		</>
	);
}
