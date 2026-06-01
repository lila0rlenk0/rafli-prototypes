import {
	Coins,
	Compass,
	Gamepad2,
	Gem,
	Gift,
	type LucideIcon,
	Percent,
	Ticket,
	User,
} from 'lucide-react';

/**
 * Lookup from the string icon names stored in `hub-content.ts` to their
 * lucide components. Keeping the data layer free of JSX (plain strings)
 * lets `hub-content.ts` stay a pure data module; this map is the single
 * resolution point shared by the sidebar, tab bar, and perks list.
 */
const ICON_MAP: Record<string, LucideIcon> = {
	compass: Compass,
	gem: Gem,
	ticket: Ticket,
	'gamepad-2': Gamepad2,
	user: User,
	percent: Percent,
	gift: Gift,
	coins: Coins,
};

interface HubIconProps {
	readonly name: string;
	readonly className?: string;
}

/**
 * Renders a lucide icon by its `hub-content.ts` string name.
 *
 * @param name - Icon key (e.g. "compass"); falls back to Compass if unknown
 * @param className - Sizing/colour utilities forwarded to the icon
 * @returns The resolved lucide icon
 */
export function HubIcon({ name, className }: HubIconProps) {
	const Icon = ICON_MAP[name] ?? Compass;
	return <Icon className={className} />;
}
