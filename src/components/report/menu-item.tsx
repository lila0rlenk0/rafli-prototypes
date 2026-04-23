'use client';

import { FlagIcon } from 'lucide-react';
import { useState } from 'react';

import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import type { ReportContentType } from '@/types/report';

import { ReportContentModal } from './content-modal';

interface ReportMenuItemProps {
	/** Type of content being reported */
	contentType: ReportContentType;
	/** ID of the specific content item */
	contentId: string;
	/** Required for comment/review/chat_message content types */
	raffleId?: string;
}

/**
 * Dropdown menu item that opens the report modal.
 * Modal rendered inline — Radix Dialog portals past overflow clipping.
 */
export function ReportMenuItem({
	contentType,
	contentId,
	raffleId,
}: ReportMenuItemProps) {
	const [open, setOpen] = useState(false);

	// onSelect preventDefault keeps dropdown open while modal mounts
	function handleSelect(e: Event) {
		e.preventDefault();
		setOpen(true);
	}

	return (
		<>
			<DropdownMenuItem onSelect={handleSelect}>
				<FlagIcon className="size-3" />
				Report
			</DropdownMenuItem>

			<ReportContentModal
				open={open}
				onOpenChange={setOpen}
				contentType={contentType}
				contentId={contentId}
				raffleId={raffleId}
			/>
		</>
	);
}
