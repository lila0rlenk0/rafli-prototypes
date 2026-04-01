'use client';

import { Copy } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import { RAFFLE_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/mixpanel-client';

interface CopyRaffleLinkButtonProps {
	publicSlug: string;
}

/**
 * Ghost icon button that copies the raffle link to clipboard.
 * Shown next to the report button in the title area.
 *
 * @returns Icon button with tooltip
 */
export function CopyRaffleLinkButton({
	publicSlug,
}: CopyRaffleLinkButtonProps) {
	function handleCopyLink() {
		const link = `${window.location.origin}/browse/${publicSlug}`;
		navigator.clipboard.writeText(link);
		track(RAFFLE_EVENTS.SHARED, {
			raffle_slug: publicSlug,
			method: 'copy_link',
		});
		toast.success('Raffle link copied to clipboard!');
	}

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					onClick={handleCopyLink}
					className="size-8 shrink-0 text-gray-400 hover:text-gray-600"
					aria-label="Copy raffle link"
				>
					<Copy className="size-4" />
				</Button>
			</TooltipTrigger>
			<TooltipContent>Copy raffle link</TooltipContent>
		</Tooltip>
	);
}
