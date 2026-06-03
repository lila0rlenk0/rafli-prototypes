/**
 * Subscription Hub — mock content + state-variant vocabulary.
 *
 * Single source of truth for the prototype. Every hub component is purely
 * presentational and reads its content from here, so swapping a state is a
 * prop change, never a component rewrite. Copy is taken verbatim from the
 * Figma "RAFLI · Subscription Hub" board (canonical desktop variant B).
 *
 * No data fetching, no server actions — this is a visualization-only surface.
 */

/* ------------------------------------------------------------------ */
/* State unions — mirror the Figma "Component states gallery".         */
/* ------------------------------------------------------------------ */

/**
 * Page-level audience mode. `subscribed` is the canonical PRO hub;
 * `guest` is the logged-out / not-subscribed view where every surface
 * flips from an active control to a locked "log in & subscribe" prompt
 * that still previews the value the visitor would unlock.
 */
export type HubMode = 'subscribed' | 'guest';

/** Game-card lifecycle states (gallery: 01–05, plus the guest lock). */
export type GameCardState =
	| 'available-free'
	| 'available-paid'
	| 'played'
	| 'out-of-credits'
	| 'locked-unsubscribed'
	| 'guest';

/** Weekly-streak macro states (gallery: 01–04, plus the guest lock). */
export type StreakState = 'fresh' | 'mid-run' | 'complete' | 'broken' | 'guest';

/** Per-tile streak sub-state. */
export type DayState = 'done' | 'today' | 'locked' | 'bonus' | 'missed';

/** Subscription tiers (gallery plan card: 01–04). */
export type PlanTier = 'none' | 'basic' | 'starter' | 'pro';

/** Credits-card balance states (gallery: 01–04). */
export type CreditsState = 'loaded' | 'low' | 'empty' | 'locked';

/** Recent-activity feed states (gallery: 01–02, plus the guest empty). */
export type ActivityState = 'populated' | 'empty' | 'guest';

/** Brand accent trio — used to tint game-card art panels + streak tiles. */
export type Accent = 'yellow' | 'mint' | 'sky';

/* ------------------------------------------------------------------ */
/* Page header                                                         */
/* ------------------------------------------------------------------ */

export const HUB_HEADER = {
	eyebrow: 'YOUR WINNING KIT',
	title: 'Today is a good day to play',
	subtitle:
		'Three games. One streak. Twelve credits ready to deploy. Let’s go.',
} as const;

/** Hero header for the logged-out / guest view. */
export const HUB_HEADER_GUEST = {
	eyebrow: 'PLAY · WIN · EARN',
	title: 'Log in to start playing and winning',
	subtitle:
		'Subscribe to unlock the games, daily streak, credits, and perks below.',
} as const;

/**
 * Shared guest-mode copy. Centralised so the "log in & subscribe" voice
 * stays consistent across the locked surfaces.
 */
export const GUEST_COPY = {
	logIn: 'Log in',
	subscribe: 'Subscribe',
	gameCta: 'Log in to access',
	streakTitle: 'Subscribe and start checking in to get bonuses',
	streakSubtitle: 'Members earn a bonus every day they play.',
	streakBadge: 'Locked',
	planEyebrow: 'CHOOSE YOUR PLAN',
	planTitle: 'Pick a plan to unlock it all',
	activityTitle: 'No activity yet',
	activitySubtitle:
		'Subscribe and log in to start playing — your wins land here.',
	perksSubtitle: 'Subscribe to unlock all of these.',
} as const;

/** Mobile-only games-section intro (desktop omits this). */
export const MOBILE_GAMES_INTRO = {
	eyebrow: 'PICK YOUR POISON',
	title: 'Three games, 18 credits up for grabs',
	subtitle: 'Play once. Play smart. The streak rewards showing up.',
} as const;

/**
 * Live "winners ticker" feed shown in the strip under the nav — replaces the
 * static share-promo line. Each row is one player with the total entries they
 * hold and how many they just won, so the strip reads as a social proof of
 * other members racking up entries in real time. Mock data only.
 */
export interface HubWinner {
	readonly name: string;
	/** Total entries this player currently holds. */
	readonly entries: number;
	/** Entries they just won in their most recent play. */
	readonly justWon: number;
}

export const HUB_WINNERS: readonly HubWinner[] = [
	{ name: 'Maya R.', entries: 142, justWon: 8 },
	{ name: 'Liam K.', entries: 97, justWon: 3 },
	{ name: 'Sofia T.', entries: 261, justWon: 12 },
	{ name: 'Noah P.', entries: 54, justWon: 2 },
	{ name: 'Ava M.', entries: 188, justWon: 5 },
	{ name: 'Ethan B.', entries: 73, justWon: 4 },
	{ name: 'Isla W.', entries: 119, justWon: 6 },
	{ name: 'Lucas D.', entries: 205, justWon: 9 },
] as const;

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

/** Lucide icon names paired in the components to avoid importing here. */
export const SIDEBAR_LINKS = [
	{ label: 'Browse', icon: 'compass' },
	{ label: 'Collectibles', icon: 'gem' },
	{ label: 'My Sweepstakes', icon: 'ticket' },
	{ label: 'Play and Earn', icon: 'gamepad-2' },
	{ label: 'My profile', icon: 'user' },
] as const;

/** Currently-highlighted sidebar entry on the hub. */
export const SIDEBAR_ACTIVE_LABEL = 'Play and Earn';

export const MOBILE_TABS = [
	{ label: 'Browse', icon: 'compass' },
	{ label: 'Collect', icon: 'gem' },
	{ label: 'Play', icon: 'gamepad-2' },
	{ label: 'Pools', icon: 'ticket' },
	{ label: 'Profile', icon: 'user' },
] as const;

export const MOBILE_ACTIVE_TAB = 'Play';

export const HUB_CREDITS_COUNT = 12;

/* ------------------------------------------------------------------ */
/* Games                                                               */
/* ------------------------------------------------------------------ */

export interface HubGame {
	readonly id: string;
	readonly eyebrow: string;
	readonly title: string;
	readonly tagline: string;
	readonly body: string;
	/** Pill copy shown for the canonical `available-*` state. */
	readonly pill: string;
	readonly cta: string;
	readonly accent: Accent;
	/** Emoji stand-in for the Figma illustration (CSS-art placeholder). */
	readonly art: string;
	/** Canonical state rendered on the live hub. */
	readonly state: GameCardState;
}

export const HUB_GAMES: readonly HubGame[] = [
	{
		id: 'lucky-scratch',
		eyebrow: 'TODAY’S FREE ONE',
		title: 'Lucky scratch',
		tagline: 'Scratch. Reveal. Win up to 5.',
		body: 'Your free daily ticket. Three panels, one prize hiding underneath.',
		pill: 'Free today',
		cta: 'Scratch now',
		accent: 'yellow',
		art: '🎟️',
		state: 'available-free',
	},
	{
		id: 'double-or-nothing',
		eyebrow: 'GUT CALL',
		title: 'Double or nothing',
		tagline: 'Heads, you double. Tails, it’s gone.',
		body: 'Stake your credits on a single coin toss. Pure nerve, instant result.',
		pill: '2–10 credits',
		cta: 'Call the flip',
		accent: 'sky',
		art: '🪙',
		state: 'available-paid',
	},
	{
		id: 'pick-a-card',
		eyebrow: 'BEST ODDS ON THE PAGE',
		title: 'Pick a card',
		tagline: 'One in three. Up to ten credits.',
		body: 'Three cards face down. Trust your gut and draw the winner.',
		pill: '1 credit',
		cta: 'Draw a card',
		accent: 'mint',
		art: '🃏',
		state: 'available-paid',
	},
] as const;

/* ------------------------------------------------------------------ */
/* Weekly streak                                                       */
/* ------------------------------------------------------------------ */

export interface StreakDay {
	readonly label: string;
	readonly state: DayState;
	/** Bottom-line caption (e.g. "Locked", "TODAY", "+5 BONUS"). */
	readonly caption: string;
}

export const STREAK_HEADER = {
	eyebrow: '🔥 WEEKLY STREAK',
	title: 'Four down. Three to go. Sunday pays +5.',
	explainer: 'Play one game a day to keep the chain alive.',
	badge: 'Day 4 of 7',
} as const;

export const STREAK_DAYS: readonly StreakDay[] = [
	{ label: 'MON', state: 'done', caption: 'Done' },
	{ label: 'TUE', state: 'done', caption: 'Done' },
	{ label: 'WED', state: 'done', caption: 'Done' },
	{ label: 'THU', state: 'today', caption: 'TODAY' },
	{ label: 'FRI', state: 'locked', caption: 'Locked' },
	{ label: 'SAT', state: 'locked', caption: 'Locked' },
	{ label: 'SUN', state: 'bonus', caption: '+5 BONUS' },
] as const;

/* ------------------------------------------------------------------ */
/* Streak completion modal                                             */
/* ------------------------------------------------------------------ */

/** Length of the weekly streak — day 7 is the bonus finale. */
export const STREAK_LENGTH = 7;

/** Credits awarded for completing the full 7-day streak. */
export const STREAK_FINALE_CREDITS = 5;

/** Shared headline shown above every per-day message. */
export const STREAK_COMPLETE_TITLE =
	'Congrats, you completed your daily streak!';

/**
 * One milestone message per streak day. After finishing a game the hub shows
 * the entry for the day just completed; day 7 is the finale that awards the
 * bonus credits and points players at the weekly Rafli Supplement.
 */
export interface StreakMilestone {
	/** 1-based day in the week. */
	readonly day: number;
	/** Big Clash Display line. */
	readonly headline: string;
	/** Supporting sentence under the headline. */
	readonly body: string;
	/** The final day — awards bonus credits and changes the CTA. */
	readonly isFinale?: boolean;
}

export const STREAK_MILESTONES: readonly StreakMilestone[] = [
	{
		day: 1,
		headline: 'Good start.',
		body: 'One day down. Come back tomorrow to keep the chain alive.',
	},
	{
		day: 2,
		headline: 'Keep going.',
		body: 'Two in a row — momentum looks good on you.',
	},
	{
		day: 3,
		headline: 'Hat trick!',
		body: 'Three days straight. You’re officially on a roll.',
	},
	{
		day: 4,
		headline: 'Halfway hero.',
		body: 'Four down, three to go. The Sunday bonus is in sight.',
	},
	{
		day: 5,
		headline: 'High five!',
		body: 'Five days deep — this chain is getting hard to break.',
	},
	{
		day: 6,
		headline: 'So close.',
		body: 'Six days strong. One more and the bonus is yours.',
	},
	{
		day: STREAK_LENGTH,
		headline: `Great! You got ${STREAK_FINALE_CREDITS} free credits.`,
		body: 'Try your luck in these games and participate in Rafli Supplement this week.',
		isFinale: true,
	},
] as const;

/* ------------------------------------------------------------------ */
/* Plan                                                                */
/* ------------------------------------------------------------------ */

export interface PlanConfig {
	readonly tier: PlanTier;
	readonly eyebrow: string;
	readonly badge: string;
	readonly price: string;
	readonly description: string;
	readonly benefits: readonly string[];
	readonly primaryCta: string;
	readonly secondaryCta: string;
}

/** Canonical PRO plan rendered on the live hub. */
export const HUB_PLAN: PlanConfig = {
	tier: 'pro',
	eyebrow: 'YOU’RE ON PRO',
	badge: 'PRO',
	price: '$9.99 / month',
	description: 'Every perk below is yours. Renews Jun 12.',
	benefits: [
		'12 credits every month',
		'15% off every entry',
		'3 daily games unlocked',
		'1 free entry every Monday',
	],
	primaryCta: 'Manage',
	secondaryCta: 'Compare tiers',
} as const;

export interface PlanChoice {
	readonly tier: PlanTier;
	readonly label: string;
	readonly price: string;
	readonly blurb: string;
	/** Pre-selected, highlighted option in the guest "Choose a plan" card. */
	readonly recommended?: boolean;
}

/** Tier options shown in the logged-out "Choose a plan" card. */
export const PLAN_CHOICES: readonly PlanChoice[] = [
	{
		tier: 'pro',
		label: 'PRO',
		price: '$9.99 / mo',
		blurb: '12 credits · 15% off · 3 daily games',
		recommended: true,
	},
	{
		tier: 'starter',
		label: 'STARTER',
		price: '$6.99 / mo',
		blurb: '8 credits · 12% off · 2 daily games',
	},
	{
		tier: 'basic',
		label: 'BASIC',
		price: '$4.99 / mo',
		blurb: '5 credits · 10% off · 1 daily game',
	},
] as const;

/* ------------------------------------------------------------------ */
/* Credits                                                             */
/* ------------------------------------------------------------------ */

export const HUB_CREDITS = {
	state: 'loaded' as CreditsState,
	count: 12,
	title: '12 credits ready',
	worth: 'Worth up to $25 off',
	explainer: '1 credit = 20% off any entry. Stack up to 5 on a single draw.',
} as const;

/* ------------------------------------------------------------------ */
/* Recent activity                                                     */
/* ------------------------------------------------------------------ */

export interface ActivityEntry {
	readonly title: string;
	readonly time: string;
	/** Signed credit delta — drives the +green / −red treatment. */
	readonly delta: number;
}

export const ACTIVITY_HEADER = {
	title: 'What you’ve been up to',
	subtitle: 'Last 5 moves, hot off the press',
} as const;

export const ACTIVITY_ENTRIES: readonly ActivityEntry[] = [
	{ title: 'Called the flip · nailed it', time: '2h ago', delta: 4 },
	{ title: 'Scratch · close, no cigar', time: '5h ago', delta: -1 },
	{ title: 'Picked the right card', time: 'Yesterday', delta: 10 },
	{ title: 'Day 3 of the streak · alive', time: 'Yesterday', delta: 1 },
	{ title: 'Coin flip · called it again', time: '2 days ago', delta: 2 },
] as const;

export const ACTIVITY_EMPTY = {
	title: 'Nothing here yet',
	subtitle: 'Play your first game to see results land here',
	cta: 'Play your first game',
} as const;

/* ------------------------------------------------------------------ */
/* Perks                                                               */
/* ------------------------------------------------------------------ */

export type PerkStatus = 'active' | 'available' | 'refilling';

export interface Perk {
	readonly title: string;
	readonly description: string;
	readonly status: PerkStatus;
	readonly statusLabel: string;
	readonly icon: string;
}

export const PERKS_HEADER = {
	title: 'The good stuff you unlocked',
	subtitle: 'Quietly working in the background while you play',
} as const;

export const HUB_PERKS: readonly Perk[] = [
	{
		title: '15% off every entry',
		description: 'Applied automatically at checkout on every sweepstake.',
		status: 'active',
		statusLabel: 'Active',
		icon: 'percent',
	},
	{
		title: '1 free entry every Monday',
		description: 'A fresh weekly ticket, on the house. Claim it anytime today.',
		status: 'available',
		statusLabel: 'Available now',
		icon: 'gift',
	},
	{
		title: '12 credits monthly',
		description: 'Your allowance tops back up at the start of each cycle.',
		status: 'refilling',
		statusLabel: 'Refills in 15 days',
		icon: 'coins',
	},
] as const;
