// Public Trustpilot profile for the app.earnm.com business unit. The Rafli
// brand inherits this trust signal from EARN'M (Rafli is an EARN'M Foundation
// subsidiary — see CLAUDE.md). Deep-linked from every Trustpilot surface
// (navbar badge, trust panel, review grid).
export const TRUSTPILOT_PROFILE_URL =
	'https://www.trustpilot.com/review/app.earnm.com';

// Trust signal copy. Hand-maintained — the official Trustpilot API requires
// the Plus plan ($319/mo) for live access and the JS TrustBox widget is
// routinely blocked by adblockers, so static values were the most reliable
// surface. Refresh quarterly or when EARN'M renegotiates the plan tier.
export const TRUSTPILOT_RATING = 4.6;
export const TRUSTPILOT_REVIEW_COUNT = 449;
export const TRUSTPILOT_RATING_LABEL = 'Rated Excellent';

export interface TrustpilotReview {
	readonly id: string;
	readonly title: string;
	readonly stars: 1 | 2 | 3 | 4 | 5;
	readonly quote: string;
	readonly authorName: string;
	// ISO-3166 alpha-2 — rendered verbatim next to the author, matching the
	// "Name · CC" pattern Trustpilot uses on its own widget cards.
	readonly country: string;
}

// Curated reviews lifted from the public Trustpilot profile. Mention of
// "Mode app" / generic earning copy is preserved because the business unit
// covers the whole EARN'M ecosystem; we surface them as-is since they're
// the live signal the Trustpilot rating is built on.
export const TRUSTPILOT_REVIEWS: readonly TrustpilotReview[] = [
	{
		id: 'great-way-extra-cash',
		title: 'A Great Way to Earn Extra Cash',
		stars: 5,
		quote:
			'Straightforward to navigate. Tasks are easy to understand. Consistent and reliable payouts. A legitimate and non-spammy way to earn a little extra on the side.',
		authorName: 'SalamCryptobro',
		country: 'BD',
	},
	{
		id: 'great-app-engaging',
		title: 'Great app, very engaging',
		stars: 4,
		quote:
			'Always points to be earned. The mystery boxes are awesome. Vesting takes a while but hopefully worth it.',
		authorName: 'David Libby',
		country: 'US',
	},
	{
		id: 'head-and-shoulders',
		title: 'Head and shoulders above any other app',
		stars: 5,
		quote:
			'I have used so many money making apps over the last several years. This one has made me more money and has never disappointed me.',
		authorName: 'Tyson Taniguchi',
		country: 'US',
	},
	{
		id: 'great-app-trustworthy',
		title: 'Great app, very trustworthy',
		stars: 5,
		quote: 'Great app, very trustworthy.',
		authorName: 'Ajiboye De Newmaster',
		country: 'US',
	},
];
