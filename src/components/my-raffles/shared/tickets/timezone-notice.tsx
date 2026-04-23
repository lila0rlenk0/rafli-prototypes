import { Globe } from 'lucide-react';

import { buildDateTime } from './ticket-dates';

interface TimezoneNoticeProps {
	endDate: string;
	endTime: string;
}

/**
 * Displays the user's local timezone alongside the UTC equivalent of the
 * raffle's end datetime. Surfaces the absolute cutoff for international
 * participants without making the host compute it manually.
 *
 * @returns Timezone + UTC end-time notice JSX.
 */
export function TimezoneNotice({ endDate, endTime }: TimezoneNoticeProps) {
	// `en-US` locale is intentional — the component ships a static English
	// copy block, so mixing locale-specific numerals would read oddly. The
	// formatter still honours the caller's timezone (forced to UTC here).
	const utcLabel = buildDateTime(endDate, endTime).toLocaleString('en-US', {
		timeZone: 'UTC',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	});
	const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

	return (
		<div className="text-muted-foreground flex items-center gap-2 text-xs">
			<Globe className="size-3.5 shrink-0" aria-hidden="true" />
			<span>
				Times are in your local timezone ({localTimezone}). Ends {utcLabel} UTC.
			</span>
		</div>
	);
}
