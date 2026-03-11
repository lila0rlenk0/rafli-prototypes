'use client';

import { FlagIcon } from 'lucide-react';
import { useState } from 'react';

import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import type { ReportContentType } from '@/types/report';

import { ReportContentModal } from './report-content-modal';

interface ReportMenuItemProps {
	/** Type of content being reported */
	contentType: ReportContentType;
	/** ID of the content being reported */
	contentId: string;
	/** Raffle ID — required for comment/review/chat_message types */
	raffleId?: string;
}

/**
 * Dropdown menu item that opens the report content modal.
 * Manages modal open state internally — parent only needs to place it
 * inside a DropdownMenuContent.
 *
 * @param props - Report menu item props
 * @param props.contentType - Type of content being reported
 * @param props.contentId - ID of the content being reported
 * @param props.raffleId - Raffle context ID — required for non-raffle content types
 */
export function ReportMenuItem({
	contentType,
	contentId,
	raffleId,
}: ReportMenuItemProps) {
	const [open, setOpen] = useState(false);

	return (
		<>
			<DropdownMenuItem
				onClick={function openReportModal() {
					setOpen(true);
				}}
			>
				<FlagIcon className="size-3" />
				Report
			</DropdownMenuItem>
			<ReportContentModal
				contentType={contentType}
				contentId={contentId}
				raffleId={raffleId}
				open={open}
				onOpenChange={setOpen}
			/>
		</>
	);
}
