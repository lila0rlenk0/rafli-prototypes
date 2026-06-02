import { type HubMode } from './hub-content';
import { HubDetailsTabs } from './hub-details-tabs';
import { PerksCard } from './perks-card';
import { RecentActivity } from './recent-activity';

interface HubDetailsProps {
	/** Audience mode — guest locks the account content. */
	readonly mode?: HubMode;
}

/**
 * Account section body (plan + credits + perks + activity), responsive by
 * viewport. Below `lg` it collapses into the consolidated `HubDetailsTabs`
 * (Plan / Perks / Activity) so the four areas occupy one panel's height
 * instead of stacking into four tall blocks. At `lg` and up it keeps the
 * desktop density: the activity feed and the merged account card side by side.
 *
 * @param mode - Audience mode (defaults to subscribed)
 * @returns The account section for the given audience
 */
export function HubDetails({ mode = 'subscribed' }: HubDetailsProps) {
	const activityState = mode === 'guest' ? 'guest' : 'populated';

	return (
		<>
			{/* Mobile/tablet: Plan / Perks / Activity folded into one tabbed card */}
			<div className="lg:hidden">
				<HubDetailsTabs mode={mode} />
			</div>

			{/* Desktop: activity feed + merged account card side by side */}
			<div className="hidden gap-6 lg:grid lg:grid-cols-2">
				<RecentActivity state={activityState} />
				<PerksCard mode={mode} />
			</div>
		</>
	);
}
