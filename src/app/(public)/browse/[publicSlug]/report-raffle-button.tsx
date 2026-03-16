'use client';

import { FlagIcon } from 'lucide-react';
import { useState } from 'react';

import { ReportContentModal } from '@/components/report/report-content-modal';
import { Button } from '@/components/ui/button';
import { REPORT_CONTENT_TYPE } from '@/types/report';

interface ReportRaffleButtonProps {
	/** The raffle ID to report */
	raffleId: string;
}

/**
 * Ghost button with flag icon that opens the report modal for a raffle.
 *
 * Shown next to the raffle title for authenticated non-owner users.
 * Uses contentType="raffle" — raffleId doubles as contentId.
 */
export function ReportRaffleButton({ raffleId }: ReportRaffleButtonProps) {
	const [open, setOpen] = useState(false);

	/** Opens the report modal */
	function handleOpen() {
		setOpen(true);
	}

	return (
		<>
			<Button
				variant="ghost"
				size="icon"
				onClick={handleOpen}
				className="size-8 shrink-0 text-gray-400 hover:text-gray-600"
				aria-label="Report raffle"
			>
				<FlagIcon className="size-4" />
			</Button>

			<ReportContentModal
				open={open}
				onOpenChange={setOpen}
				contentType={REPORT_CONTENT_TYPE.RAFFLE}
				contentId={raffleId}
				raffleId={raffleId}
			/>
		</>
	);
}
