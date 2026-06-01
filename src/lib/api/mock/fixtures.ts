import 'server-only';

import type { AuthSession, AuthUser } from '@/types/auth';
import type { Category } from '@/types/category';
import type { Raffle } from '@/types/raffle';
import type {
	MySubscriptionResponse,
	SubscriptionStatus,
} from '@/types/subscription';
import type { MeResponse } from '@/types/user';
import type { RecentWinner } from '@/types/winning';

/**
 * Local-preview fixture data, used only when `MOCK_DATA=true` (see
 * `@/lib/api/mock/adapter`). Shapes mirror the backend DTOs exactly so the
 * service-layer `schema.parse()` calls validate them as if they came over the
 * wire — if a fixture drifts from a Zod schema, the parse throws and the
 * matching section degrades instead of rendering bad data.
 *
 * Not wired to any real backend — these never load in production because the
 * mock adapter is only attached when the env flag is set.
 */

// Fixed reference points relative to the local dev "today" (~mid-2026). Live
// raffles end in the future so countdowns read "N days left"; completed ones
// sit in the past so they populate the past-draws + winners surfaces.
const NOW_ISO = '2026-05-29T12:00:00.000Z';
const LIVE_START_ISO = '2026-05-01T12:00:00.000Z';
const LIVE_END_ISO = '2026-06-20T12:00:00.000Z';
const PAST_START_ISO = '2026-03-01T12:00:00.000Z';
const PAST_END_ISO = '2026-04-15T12:00:00.000Z';

// Valid UUID v7 values — `hostSchema.id` is `z.uuidv7()`, so plain strings
// would fail validation. Version nibble is 7 and the variant nibble is 8/9/a/b.
const HOST_IDS = [
	'0190a1b2-c3d4-7e5f-8a1b-2c3d4e5f6a7b',
	'0190a1b2-c3d4-7e5f-9b2c-3d4e5f6a7b8c',
	'0190a1b2-c3d4-7e5f-ab3d-4e5f6a7b8c9d',
	'0190a1b2-c3d4-7e5f-bc4e-5f6a7b8c9d0e',
] as const;

interface RaffleSeed {
	readonly id: string;
	readonly title: string;
	readonly description: string;
	readonly categoryId: string;
	readonly cover: string;
	readonly declaredValueAmount: string;
	readonly ticketPriceAmount: string;
	readonly numberOfWinners: number;
	readonly maxParticipants: number;
	readonly participantsCount: number;
	readonly hostName: string;
	readonly hostUsername: string;
}

/**
 * Expands a compact seed into a fully schema-valid `Raffle`, filling the long
 * tail of required fields with sensible defaults shared by every fixture.
 *
 * @param seed - Minimal per-raffle data that actually varies between cards
 * @param status - Lifecycle status driving which surface the raffle appears on
 * @param index - Position in the pool, used to rotate host identity + slug
 * @returns A `Raffle` that passes `raffleSchema.parse()`
 */
function makeRaffle(
	seed: RaffleSeed,
	status: Raffle['status'],
	index: number,
): Raffle {
	const isCompleted = status === 'completed';
	const ticketsSold = Math.min(seed.participantsCount, seed.maxParticipants);

	return {
		id: seed.id,
		title: seed.title,
		description: seed.description,
		categoryId: seed.categoryId,
		coverMediaUrl: seed.cover,
		featuredCoverUrl: seed.cover,
		isFeatured: false,
		galleryMediaUrls: [seed.cover],
		declaredValueAmount: seed.declaredValueAmount,
		declaredValueCurrency: 'USD',
		ticketPriceAmount: seed.ticketPriceAmount,
		ticketPriceCurrency: 'USD',
		startAt: isCompleted ? PAST_START_ISO : LIVE_START_ISO,
		endAt: isCompleted ? PAST_END_ISO : LIVE_END_ISO,
		timezone: 'UTC',
		numberOfWinners: seed.numberOfWinners,
		minParticipants: 10,
		maxParticipants: seed.maxParticipants,
		minTickets: 0,
		deliveryIncluded: true,
		status,
		publicSlugOrCode: `${seed.id}`,
		participantsCount: seed.participantsCount,
		ticketsSoldCount: ticketsSold,
		revenueAmount: String(ticketsSold * Number(seed.ticketPriceAmount)),
		hostId: HOST_IDS[index % HOST_IDS.length],
		questionId: null,
		createdAt: isCompleted ? PAST_START_ISO : LIVE_START_ISO,
		updatedAt: NOW_ISO,
		host: {
			id: HOST_IDS[index % HOST_IDS.length],
			name: seed.hostName,
			username: seed.hostUsername,
			avatar: null,
			totalRaffles: 12 + index,
		},
		cryptoOptions: null,
		winners: isCompleted
			? [{ position: 1, status: 'received', name: 'Anna T.' }]
			: undefined,
	};
}

const LIVE_SEEDS: readonly RaffleSeed[] = [
	{
		id: 'mock-live-macbook',
		title: 'MacBook Pro 16" M4 Max',
		description:
			'Brand-new MacBook Pro 16-inch with the M4 Max chip, 48GB unified memory and 1TB SSD. Sealed in box.',
		categoryId: 'cat-electronics',
		cover: '/mock/cover-1.svg',
		declaredValueAmount: '3999',
		ticketPriceAmount: '5',
		numberOfWinners: 1,
		maxParticipants: 2000,
		participantsCount: 1340,
		hostName: 'Tech Vault',
		hostUsername: 'techvault',
	},
	{
		id: 'mock-live-bali',
		title: '7 Nights in Bali for Two',
		description:
			'A week in a private villa in Ubud for two, return flights included, plus a sunrise volcano tour.',
		categoryId: 'cat-travel',
		cover: '/mock/cover-2.svg',
		declaredValueAmount: '6500',
		ticketPriceAmount: '8',
		numberOfWinners: 1,
		maxParticipants: 3000,
		participantsCount: 2210,
		hostName: 'Wander Club',
		hostUsername: 'wanderclub',
	},
	{
		id: 'mock-live-cash',
		title: '$10,000 Cash Giveaway',
		description:
			'Ten thousand US dollars paid directly to your linked wallet within 48 hours of the draw.',
		categoryId: 'cat-cash',
		cover: '/mock/cover-3.svg',
		declaredValueAmount: '10000',
		ticketPriceAmount: '10',
		numberOfWinners: 1,
		maxParticipants: 5000,
		participantsCount: 4120,
		hostName: 'Rafli Official',
		hostUsername: 'rafli',
	},
	{
		id: 'mock-live-ps5',
		title: 'PS5 Pro Ultimate Bundle',
		description:
			'PlayStation 5 Pro with two DualSense controllers and three blockbuster titles of your choice.',
		categoryId: 'cat-gaming',
		cover: '/mock/cover-4.svg',
		declaredValueAmount: '1200',
		ticketPriceAmount: '3',
		numberOfWinners: 2,
		maxParticipants: 1500,
		participantsCount: 980,
		hostName: 'Pixel Prizes',
		hostUsername: 'pixelprizes',
	},
	{
		id: 'mock-live-tesla',
		title: 'Tesla Model 3 Long Range',
		description:
			'A brand-new Tesla Model 3 Long Range in Pearl White, registration and delivery covered.',
		categoryId: 'cat-auto',
		cover: '/mock/cover-5.svg',
		declaredValueAmount: '45000',
		ticketPriceAmount: '15',
		numberOfWinners: 1,
		maxParticipants: 8000,
		participantsCount: 5630,
		hostName: 'Drive Dreams',
		hostUsername: 'drivedreams',
	},
	{
		id: 'mock-live-iphone',
		title: 'iPhone 17 Pro Max 1TB',
		description:
			'The latest iPhone 17 Pro Max in Titanium with 1TB storage, plus a year of AppleCare+.',
		categoryId: 'cat-electronics',
		cover: '/mock/cover-6.svg',
		declaredValueAmount: '1599',
		ticketPriceAmount: '4',
		numberOfWinners: 1,
		maxParticipants: 2500,
		participantsCount: 1875,
		hostName: 'Tech Vault',
		hostUsername: 'techvault',
	},
];

const PAST_SEEDS: readonly RaffleSeed[] = [
	{
		id: 'mock-past-watch',
		title: 'Rolex Submariner',
		description: 'A classic Rolex Submariner Date in Oystersteel.',
		categoryId: 'cat-fashion',
		cover: '/mock/cover-3.svg',
		declaredValueAmount: '14000',
		ticketPriceAmount: '20',
		numberOfWinners: 1,
		maxParticipants: 3000,
		participantsCount: 3000,
		hostName: 'Luxe Locker',
		hostUsername: 'luxelocker',
	},
	{
		id: 'mock-past-gaming-rig',
		title: 'RTX 5090 Gaming PC',
		description: 'A custom water-cooled rig with an RTX 5090 and Ryzen 9.',
		categoryId: 'cat-gaming',
		cover: '/mock/cover-4.svg',
		declaredValueAmount: '4500',
		ticketPriceAmount: '7',
		numberOfWinners: 1,
		maxParticipants: 2000,
		participantsCount: 2000,
		hostName: 'Pixel Prizes',
		hostUsername: 'pixelprizes',
	},
	{
		id: 'mock-past-maldives',
		title: 'Maldives Overwater Villa',
		description: 'Five nights in an overwater villa with all meals included.',
		categoryId: 'cat-travel',
		cover: '/mock/cover-2.svg',
		declaredValueAmount: '9000',
		ticketPriceAmount: '12',
		numberOfWinners: 1,
		maxParticipants: 2500,
		participantsCount: 2500,
		hostName: 'Wander Club',
		hostUsername: 'wanderclub',
	},
	{
		id: 'mock-past-macbook-air',
		title: 'MacBook Air M4',
		description: 'A 15-inch MacBook Air with the M4 chip in Midnight.',
		categoryId: 'cat-electronics',
		cover: '/mock/cover-1.svg',
		declaredValueAmount: '1499',
		ticketPriceAmount: '5',
		numberOfWinners: 1,
		maxParticipants: 1800,
		participantsCount: 1800,
		hostName: 'Tech Vault',
		hostUsername: 'techvault',
	},
];

/** Live raffles — drive the landing grid + /browse list. */
export const MOCK_LIVE_RAFFLES: readonly Raffle[] = LIVE_SEEDS.map((seed, i) =>
	makeRaffle(seed, 'live', i),
);

/** Completed raffles — drive the past-draws carousel. */
export const MOCK_COMPLETED_RAFFLES: readonly Raffle[] = PAST_SEEDS.map(
	(seed, i) => makeRaffle(seed, 'completed', i),
);

/** Admin-curated featured raffles — the blue/green hero band (0-2 items). */
export const MOCK_FEATURED_RAFFLES: readonly Raffle[] = [
	{ ...MOCK_LIVE_RAFFLES[2], isFeatured: true },
	{ ...MOCK_LIVE_RAFFLES[4], isFeatured: true },
];

/** Public "Most recent winners!" strip — names already masked to "First L.". */
export const MOCK_RECENT_WINNERS: readonly RecentWinner[] = [
	{
		position: 1,
		prizeAmount: '10000',
		prizeCurrency: 'USD',
		prizeLabel: '$10,000 Cash',
		raffleId: 'mock-past-cash',
		raffleSlug: 'mock-past-cash',
		raffleTitle: '$10,000 Cash Giveaway',
		ticketCode: 'RFL-8F2A19',
		winnerDisplayName: 'Anna T.',
		wonAt: PAST_END_ISO,
	},
	{
		position: 1,
		prizeAmount: '14000',
		prizeCurrency: 'USD',
		prizeLabel: 'Rolex Submariner',
		raffleId: 'mock-past-watch',
		raffleSlug: 'mock-past-watch',
		raffleTitle: 'Rolex Submariner',
		ticketCode: 'RFL-3C71B0',
		winnerDisplayName: 'Marcus D.',
		wonAt: PAST_END_ISO,
	},
	{
		position: 1,
		prizeAmount: '4500',
		prizeCurrency: 'USD',
		prizeLabel: 'RTX 5090 Gaming PC',
		raffleId: 'mock-past-gaming-rig',
		raffleSlug: 'mock-past-gaming-rig',
		raffleTitle: 'RTX 5090 Gaming PC',
		ticketCode: 'RFL-A50E42',
		winnerDisplayName: 'Priya S.',
		wonAt: PAST_END_ISO,
	},
	{
		position: 1,
		prizeAmount: '9000',
		prizeCurrency: 'USD',
		prizeLabel: 'Maldives Overwater Villa',
		raffleId: 'mock-past-maldives',
		raffleSlug: 'mock-past-maldives',
		raffleTitle: 'Maldives Overwater Villa',
		ticketCode: 'RFL-6B98C3',
		winnerDisplayName: 'Liam O.',
		wonAt: PAST_END_ISO,
	},
	{
		position: 1,
		prizeAmount: '1499',
		prizeCurrency: 'USD',
		prizeLabel: 'MacBook Air M4',
		raffleId: 'mock-past-macbook-air',
		raffleSlug: 'mock-past-macbook-air',
		raffleTitle: 'MacBook Air M4',
		ticketCode: 'RFL-D210F7',
		winnerDisplayName: 'Sofia R.',
		wonAt: PAST_END_ISO,
	},
	{
		position: 2,
		prizeAmount: '1200',
		prizeCurrency: 'USD',
		prizeLabel: 'PS5 Pro Ultimate Bundle',
		raffleId: 'mock-past-ps5',
		raffleSlug: 'mock-past-ps5',
		raffleTitle: 'PS5 Pro Ultimate Bundle',
		ticketCode: 'RFL-77E0AA',
		winnerDisplayName: 'Noah K.',
		wonAt: PAST_END_ISO,
	},
];

/** Raffle categories — populate the /browse filter chips. */
export const MOCK_CATEGORIES: readonly Category[] = [
	{
		id: 'cat-electronics',
		name: 'Electronics',
		slug: 'electronics',
		description: 'Phones, laptops, and gadgets',
		isActive: true,
		sortOrder: 1,
		createdAt: LIVE_START_ISO,
		updatedAt: NOW_ISO,
	},
	{
		id: 'cat-travel',
		name: 'Travel',
		slug: 'travel',
		description: 'Holidays and getaways',
		isActive: true,
		sortOrder: 2,
		createdAt: LIVE_START_ISO,
		updatedAt: NOW_ISO,
	},
	{
		id: 'cat-cash',
		name: 'Cash',
		slug: 'cash',
		description: 'Straight-to-wallet cash prizes',
		isActive: true,
		sortOrder: 3,
		createdAt: LIVE_START_ISO,
		updatedAt: NOW_ISO,
	},
	{
		id: 'cat-gaming',
		name: 'Gaming',
		slug: 'gaming',
		description: 'Consoles, PCs, and peripherals',
		isActive: true,
		sortOrder: 4,
		createdAt: LIVE_START_ISO,
		updatedAt: NOW_ISO,
	},
	{
		id: 'cat-auto',
		name: 'Automotive',
		slug: 'automotive',
		description: 'Cars and motorbikes',
		isActive: true,
		sortOrder: 5,
		createdAt: LIVE_START_ISO,
		updatedAt: NOW_ISO,
	},
	{
		id: 'cat-fashion',
		name: 'Fashion',
		slug: 'fashion',
		description: 'Watches, bags, and apparel',
		isActive: true,
		sortOrder: 6,
		createdAt: LIVE_START_ISO,
		updatedAt: NOW_ISO,
	},
];

// ==========================================
// Mock auth + subscription (toggleable preview states)
// ==========================================

// Subscription benefits run until this future date so active/cancelled/past_due
// all keep their discount in `resolveSubscriptionContext` (which drops benefits
// once currentPeriodEnd has lapsed).
const SUB_PERIOD_END_ISO = '2026-07-15T12:00:00.000Z';

/** Opaque token the mock auth path hands the axios interceptor — never decoded. */
export const MOCK_TOKEN = 'mock-session-token';

/** The signed-in user simulated in every non-guest mock state. */
export const MOCK_AUTH_USER: AuthUser = {
	id: 'mock-user-1',
	email: 'preview@rafli.win',
	emailVerified: true,
	name: 'Preview User',
	image: null,
	permissions: [],
};

/** Full `GET /me` profile for the mock user — matches `meResponseSchema`. */
export const MOCK_ME: MeResponse = {
	id: MOCK_AUTH_USER.id,
	email: MOCK_AUTH_USER.email,
	emailVerified: true,
	name: MOCK_AUTH_USER.name,
	username: 'previewuser',
	image: null,
	bio: 'Just here to preview the UI.',
	permissions: [],
	hasPassword: true,
	createdAt: LIVE_START_ISO,
	updatedAt: NOW_ISO,
};

/**
 * Builds a mock `AuthSession` for the signed-in preview user.
 *
 * @returns An `AuthSession` satisfying `authSessionSchema`
 */
export function buildMockAuthSession(): AuthSession {
	return {
		user: MOCK_AUTH_USER,
		token: MOCK_TOKEN,
		expiresAt: SUB_PERIOD_END_ISO,
	};
}

// Plan + capabilities typed against the response schema so the literals below
// are checked against the real contract (and the provider array isn't widened
// to a readonly tuple that fails assignment).
type MockSubscription = NonNullable<MySubscriptionResponse['subscription']>;
type MockPlan = MockSubscription['plan'];
type MockCapabilities = NonNullable<MySubscriptionResponse['capabilities']>;

// Pro-tier plan embedded in the subscription envelope — drives the 20%
// subscriber discount shown on the ticket purchase card.
const MOCK_PLAN: MockPlan = {
	id: '0190a1b2-c3d4-7e5f-8a1b-2c3d4e5f6a70',
	name: 'Pro',
	monthlyPriceAmount: '100.0000',
	creditAmount: '125.0000',
	discountPercent: 20,
	availableProviders: ['stripe', 'fanbasis'] as const,
	metadata: {
		badgeText: 'POPULAR',
		highlightLabel: 'BEST VALUE',
		isHighlighted: true,
		sortOrder: 2,
		tagline: 'For regular players',
		features: [
			{ text: '25 free weekly entries', tag: null },
			{ text: '20% off every ticket', tag: 'LIMITED OFFER' },
			{ text: 'Priority access to new drops', tag: null },
		],
	},
};

const MOCK_CAPABILITIES: MockCapabilities = {
	canCancel: true,
	canChangePlan: true,
	canUpdatePaymentMethod: true,
	hasSelfServePortal: true,
	canScheduleDowngrade: true,
	canCancelScheduledChange: false,
};

/**
 * Builds the `GET /me/subscription` envelope for a given status. A null status
 * (the "logged in, never subscribed" state) returns the empty envelope the
 * backend sends — `subscription`, `capabilities`, and `lockedProvider` all null.
 *
 * @param status - Subscription status to simulate, or null for no subscription
 * @returns A `MySubscriptionResponse` matching `mySubscriptionResponseSchema`
 */
export function buildMockSubscriptionEnvelope(
	status: SubscriptionStatus | null,
): MySubscriptionResponse {
	if (status === null) {
		return { subscription: null, capabilities: null, lockedProvider: null };
	}

	return {
		subscription: {
			id: '0190a1b2-c3d4-7e5f-9b2c-2c3d4e5f6a71',
			plan: MOCK_PLAN,
			status,
			currentPeriodEnd: SUB_PERIOD_END_ISO,
			cancelledAt: status === 'cancelled' ? NOW_ISO : null,
			pendingPlan: null,
			pendingPlanEffectiveAt: null,
		},
		capabilities: MOCK_CAPABILITIES,
		lockedProvider: 'stripe',
	};
}
