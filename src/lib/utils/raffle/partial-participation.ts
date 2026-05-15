import { RAFFLE_STATUS, type Raffle } from '@/types/raffle';

// ==========================================
// Constants — mirror backend src/core/raffles/constants/payout-fees.ts
// ==========================================

/** Basis-point precision for the platform fee. 10000 = 100%. */
const BPS_DENOMINATOR = 10000n;

/** Platform fee in basis points — 1% kept, 99% distributed to winners. */
const PLATFORM_FEE_BPS = 100n;

/** Decimal scale used by the backend for money columns (NUMERIC(19,4)). */
const MONEY_SCALE = 4;

// ==========================================
// Predicate
// ==========================================

type PartialParticipationRaffle = Pick<
	Raffle,
	| 'status'
	| 'participantsCount'
	| 'minParticipants'
	| 'numberOfWinners'
	| 'winners'
>;

/**
 * Whether a concluded raffle paid out as a revenue share instead of awarding
 * the original prize. Mirrors the backend trigger in init-draw-process —
 * `minParticipants > 0 AND uniqueParticipants < minParticipants` — and gates
 * on the draw having actually completed (status `completed`/`fulfilling` with
 * a populated winners array).
 *
 * Client-side derivation keeps the surface non-breaking: no API additions
 * required. If the backend later exposes `payoutMode` directly, callers can
 * switch over without changing the call sites.
 */
export function isPartialParticipation(
	raffle: PartialParticipationRaffle,
): boolean {
	const concluded =
		raffle.status === RAFFLE_STATUS.COMPLETED ||
		raffle.status === RAFFLE_STATUS.FULFILLING;
	if (!concluded) return false;
	if ((raffle.winners?.length ?? 0) === 0) return false;
	if (raffle.minParticipants <= 0) return false;
	return raffle.participantsCount < raffle.minParticipants;
}

// ==========================================
// Per-winner credit math
// ==========================================

/**
 * Parse a decimal string ("167.30", "167.3000", "0") into a scaled BigInt at
 * the given scale (e.g. "167.3" + scale 4 → 1_673_000n). Returns null on
 * malformed input — undefined chars, negative values, or fractional digits
 * exceeding the scale.
 *
 * Why bigint: matches backend payout-fees.ts precisely. Float math would
 * drift on values like 167.3 → 167.29999… and produce a different last cent.
 */
function parseDecimalToScaledBigInt(
	value: string,
	scale: number,
): bigint | null {
	if (!/^\d+(\.\d+)?$/.test(value)) return null;
	const [whole, frac = ''] = value.split('.');
	if (frac.length > scale) return null;
	const padded = frac.padEnd(scale, '0');
	return BigInt(whole + padded);
}

/** Reverse of parseDecimalToScaledBigInt — render "552090" + scale 4 → "55.2090". */
function formatScaledBigIntToDecimal(value: bigint, scale: number): string {
	const str = value.toString().padStart(scale + 1, '0');
	const cut = str.length - scale;
	return `${str.slice(0, cut)}.${str.slice(cut)}`;
}

/**
 * Compute the per-winner credit payout for a revenue-share draw.
 *
 * Formula (mirrors `computePayoutAmountPerWinner` in
 * src/core/raffles/constants/payout-fees.ts on the backend):
 *
 *     floor(revenue × (10000 - PLATFORM_FEE_BPS) / 10000 / numberOfWinners)
 *
 * Truncation is intentional — sub-unit remainders stay in the platform's 1%
 * slice rather than over-paying any single winner. Determinism via BigInt
 * means the FE-rendered amount always matches the backend's ledger grant.
 *
 * @returns decimal string at MONEY_SCALE (e.g. "55.2090"), or null when
 *   inputs are malformed or numberOfWinners ≤ 0.
 */
export function computePayoutAmountPerWinner(
	revenueAmount: string,
	numberOfWinners: number,
): string | null {
	if (!Number.isInteger(numberOfWinners) || numberOfWinners <= 0) return null;
	const scaledRevenue = parseDecimalToScaledBigInt(revenueAmount, MONEY_SCALE);
	if (scaledRevenue === null) return null;

	const winnerShareBps = BPS_DENOMINATOR - PLATFORM_FEE_BPS;
	const winners = BigInt(numberOfWinners);

	// Combine divisors into one operation — splitting compounds rounding and
	// could under-pay by an extra dust unit on small revenue amounts.
	const perWinnerScaled =
		(scaledRevenue * winnerShareBps) / (BPS_DENOMINATOR * winners);
	return formatScaledBigIntToDecimal(perWinnerScaled, MONEY_SCALE);
}

/**
 * Total amount distributed across all winners — `perWinner × numberOfWinners`.
 * Used to show the "distributed to winners" line in the breakdown.
 */
export function computeTotalDistributed(
	perWinner: string,
	numberOfWinners: number,
): string | null {
	const scaled = parseDecimalToScaledBigInt(perWinner, MONEY_SCALE);
	if (scaled === null) return null;
	return formatScaledBigIntToDecimal(
		scaled * BigInt(numberOfWinners),
		MONEY_SCALE,
	);
}

/**
 * Platform-fee slice as a decimal string — `revenue − distributed`. Computed
 * by subtraction (not as `revenue × 1%`) so the displayed numbers always sum
 * exactly to revenue, even when floor-truncation routed extra dust to the
 * platform.
 */
export function computePlatformFee(
	revenueAmount: string,
	totalDistributed: string,
): string | null {
	const revenue = parseDecimalToScaledBigInt(revenueAmount, MONEY_SCALE);
	const distributed = parseDecimalToScaledBigInt(totalDistributed, MONEY_SCALE);
	if (revenue === null || distributed === null) return null;
	return formatScaledBigIntToDecimal(revenue - distributed, MONEY_SCALE);
}

// ==========================================
// Display helpers
// ==========================================

/**
 * Format a credit amount for display — collapses trailing zeros below the
 * 2-decimal display floor so "55.2090" renders as "55.21" (rounded) but
 * "55.0000" renders as "55". Keeps parity with how `formatCurrency` trims
 * the existing money surfaces.
 */
export function formatCredits(amount: string): string {
	const n = parseFloat(amount);
	if (!Number.isFinite(n)) return amount;
	return new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	}).format(n);
}
