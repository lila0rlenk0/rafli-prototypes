'use client';

import { MoreHorizontal, Package, PackageCheck } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Command, CommandItem, CommandList } from '@/components/ui/command';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { markDelivered } from '@/services/winning/mark-delivered';
import type { HostWinnerEntry, WinningStatus } from '@/types/winning';

import { MarkSentModal } from './mark-sent-modal';

interface WinnerActionMenuProps {
	/** The winner entry data */
	winner: HostWinnerEntry;
	/** Callback when status changes */
	onStatusChange: (winningId: string, newStatus: WinningStatus) => void;
}

/**
 * WinnerActionMenu Component
 *
 * Three-dot dropdown menu for host actions on a winner.
 * Shows different actions based on current status and shipping info.
 */
export function WinnerActionMenu({
	winner,
	onStatusChange,
}: WinnerActionMenuProps) {
	const [open, setOpen] = useState(false);
	const [markSentModalOpen, setMarkSentModalOpen] = useState(false);
	const [isMarkingDelivered, startTransition] = useTransition();

	const isPending = winner.status === 'pending';
	const isAwaitingHost = winner.status === 'awaiting_host';
	const isSent = winner.status === 'sent';
	const isCompleted =
		winner.status === 'delivered' ||
		winner.status === 'received' ||
		winner.status === 'resolved';

	const waitingForShipping = isPending;
	const canMarkSent = isAwaitingHost && !isMarkingDelivered;
	const canMarkDelivered = isSent && !isMarkingDelivered;

	/**
	 * Handles mark as delivered action
	 */
	function handleMarkDelivered() {
		setOpen(false);
		startTransition(async () => {
			const result = await markDelivered(winner.id);

			if (!result.success) {
				toast.error('Failed to mark as delivered. Please try again.');
				return;
			}

			toast.success('Marked as delivered!');
			onStatusChange(winner.id, 'delivered');
		});
	}

	/**
	 * Handles successful mark sent
	 */
	function handleMarkSentSuccess() {
		onStatusChange(winner.id, 'sent');
	}

	/**
	 * Opens mark sent modal
	 */
	function handleOpenMarkSent() {
		setOpen(false);
		setMarkSentModalOpen(true);
	}

	// Hide menu for completed statuses
	if (isCompleted) {
		return null;
	}

	return (
		<>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className="size-8 p-0"
						disabled={isMarkingDelivered}
					>
						<MoreHorizontal className="size-4" />
						<span className="sr-only">Open menu</span>
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-56 p-0" align="end">
					<Command>
						<CommandList>
							{waitingForShipping && (
								<div className="px-3 py-2 text-sm text-gray-500">
									Waiting for winner to provide shipping address
								</div>
							)}
							{canMarkSent && (
								<CommandItem
									onSelect={handleOpenMarkSent}
									className="cursor-pointer gap-2"
								>
									<Package className="size-4" />
									Mark as Sent
								</CommandItem>
							)}
							{canMarkDelivered && (
								<CommandItem
									onSelect={handleMarkDelivered}
									className="cursor-pointer gap-2"
								>
									<PackageCheck className="size-4" />
									Mark as Delivered
								</CommandItem>
							)}
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>

			<MarkSentModal
				open={markSentModalOpen}
				onOpenChange={setMarkSentModalOpen}
				winningId={winner.id}
				onSuccess={handleMarkSentSuccess}
			/>
		</>
	);
}
