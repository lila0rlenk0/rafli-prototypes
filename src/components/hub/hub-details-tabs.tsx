'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { type HubMode } from './hub-content';
import { PerksList, PlanBlock } from './perks-card';
import { ActivityBody } from './recent-activity';

/** Tab order for the consolidated account panel. */
const DETAIL_TABS = [
	{ id: 'plan', label: 'Plan' },
	{ id: 'perks', label: 'Perks' },
	{ id: 'activity', label: 'Activity' },
] as const;

interface HubDetailsTabsProps {
	/** Audience mode — guest locks the plan/credits/perks content. */
	readonly mode?: HubMode;
}

/**
 * Mobile account panel — Plan (with credits), Perks, and Activity folded into
 * one tabbed card so the four areas that used to stack into four tall blocks
 * now occupy a single panel's height. The tab label stands in for each
 * section's heading, which is why the panel bodies are header-less.
 *
 * Reuses the exact desktop content (`PlanBlock`, `PerksList`, `ActivityBody`)
 * — no copy or logic is duplicated. Renders below the `lg` breakpoint only;
 * desktop keeps the activity + account cards side by side.
 *
 * @param mode - Audience mode (defaults to subscribed)
 * @returns The mobile consolidated account tabs
 */
export function HubDetailsTabs({ mode = 'subscribed' }: HubDetailsTabsProps) {
	const activityState = mode === 'guest' ? 'guest' : 'populated';

	return (
		<Tabs defaultValue="plan" className="gap-4">
			<TabsList className="grid h-auto w-full grid-cols-3 p-1">
				{DETAIL_TABS.map(tab => (
					<TabsTrigger
						key={tab.id}
						value={tab.id}
						className="h-auto min-h-11 py-2 text-sm font-semibold"
					>
						{tab.label}
					</TabsTrigger>
				))}
			</TabsList>

			<div className="rounded-2xl border border-black/10 bg-white p-5">
				<TabsContent value="plan">
					<PlanBlock mode={mode} />
				</TabsContent>
				<TabsContent value="perks">
					<PerksList mode={mode} />
				</TabsContent>
				<TabsContent value="activity">
					<ActivityBody state={activityState} />
				</TabsContent>
			</div>
		</Tabs>
	);
}
