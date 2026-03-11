'use client';

import { Loader2Icon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useTimeout } from '@/lib/hooks/use-timeout';
import { getReportErrorMessage } from '@/lib/report/error-messages';
import { useCreateReport } from '@/services/report/use-create-report';
import type { ReportContentType } from '@/types/report';

interface ReportContentModalProps {
	/** Type of content being reported */
	contentType: ReportContentType;
	/** ID of the content being reported */
	contentId: string;
	/** Raffle ID — required for comment/review/chat_message types */
	raffleId?: string;
	/** Whether the modal is open */
	open: boolean;
	/** Callback when modal open state changes */
	onOpenChange: (open: boolean) => void;
}

/**
 * Modal for users to report inappropriate content (raffles, comments, reviews).
 * Submits report to moderation system via POST /api/v1/reports.
 * Resets form state after close animation completes (200ms delay).
 *
 * @param props - Report modal props
 * @param props.contentType - Type of content being reported (raffle, comment, etc.)
 * @param props.contentId - ID of the content being reported
 * @param props.raffleId - Raffle context ID — required for non-raffle content types
 * @param props.open - Whether the modal is open
 * @param props.onOpenChange - Callback when modal open state changes
 */
export function ReportContentModal({
	contentType,
	contentId,
	raffleId,
	open,
	onOpenChange,
}: ReportContentModalProps) {
	const [reason, setReason] = useState('');
	const reportMutation = useCreateReport();
	const setCloseTimeout = useTimeout();

	/** Submits the report and shows success/error toast */
	function handleSubmit() {
		reportMutation.mutate(
			{ contentId, contentType, raffleId, reason },
			{
				onSuccess() {
					toast.success("Report submitted. We'll review it shortly.");
					onOpenChange(false);
				},
				onError(error) {
					toast.error(getReportErrorMessage(error.code));
				},
			},
		);
	}

	/** Resets modal state after close animation */
	function handleOpenChange(newOpen: boolean) {
		if (!newOpen) {
			setCloseTimeout(() => {
				setReason('');
				reportMutation.reset();
			}, 200);
		}
		onOpenChange(newOpen);
	}

	/** Whether the submit button should be disabled */
	function isSubmitDisabled(): boolean {
		return reportMutation.isPending || reason.length < 10;
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-lg border border-black py-8">
				<DialogHeader className="flex items-center justify-center space-y-2">
					<DialogTitle className="font-clash-display text-2xl">
						Report Content
					</DialogTitle>
					<DialogDescription className="text-center">
						Help us understand what&apos;s wrong with this content.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-2">
					<Textarea
						value={reason}
						onChange={function handleChange(e) {
							setReason(e.target.value);
						}}
						placeholder="Describe the issue (10-500 characters)"
						maxLength={500}
						rows={4}
					/>
					<p className="text-right text-xs text-[#B4B4B4]">
						{reason.length}/500
					</p>
				</div>

				<Button
					onClick={handleSubmit}
					disabled={isSubmitDisabled()}
					className="hover:bg-background w-full border-2 border-black bg-black hover:text-black"
				>
					{reportMutation.isPending ? (
						<Loader2Icon className="size-4 animate-spin" />
					) : (
						'Submit Report'
					)}
				</Button>
			</DialogContent>
		</Dialog>
	);
}
