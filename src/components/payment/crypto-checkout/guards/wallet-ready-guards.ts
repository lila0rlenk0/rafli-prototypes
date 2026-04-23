import type { Address } from 'viem';

import type { PaymentErrorCode, WalletErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import type {
	AtomicCryptoCheckoutPayload,
	AtomicCryptoCheckoutResponse,
	CryptoCheckoutSession,
	VerifyWalletPayload,
	WalletResponse,
} from '@/types/wallet';
import type { RaffleCryptoToken } from '@/types/raffle';

import { getReviewSessionGuard } from '@/components/payment/crypto-checkout/session/session-guards';

/**
 * Inputs for the EIP-191 verification message.
 *
 * Backend reconstructs this exact string from (address, userId, timestamp),
 * so any deviation in casing, whitespace, or field order breaks recovery.
 */
interface BuildEipVerificationMessageParams {
	address: Address;
	userId: string;
	timestamp: string;
}

/**
 * Builds the EIP-191 plaintext message used by `verifyWallet`.
 *
 * Format MUST stay byte-for-byte identical to the backend reconstruction
 * in `POST /me/wallets/verify` — the server recovers the signer address
 * from this exact string, so altering anything here (including trailing
 * whitespace) would invalidate every signed payload.
 *
 * @param params - Checksummed address, authenticated user id, ISO timestamp
 * @returns The plaintext message the wallet must sign with `personal_sign`
 */
export function buildEipVerificationMessage({
	address,
	userId,
	timestamp,
}: BuildEipVerificationMessageParams): string {
	return `Link wallet ${address} to Raffles account ${userId} at ${timestamp}`;
}

/**
 * Inputs for the existing-session reusability predicate. Kept as a plain
 * params object so the caller can pass already-narrowed variables without
 * the helper having to re-check nullability of every field itself.
 */
interface IsExistingSessionReusableParams {
	session: CryptoCheckoutSession | null;
	selectedChainId: number | null;
	sessionTokenId: string | null;
	selectedToken: RaffleCryptoToken | null;
	connectedAddress: Address | null;
	sessionWalletAddress: Address | null;
}

/**
 * Returns whether the current FE session can skip the atomic-checkout call
 * and jump straight to hydration.
 *
 * Reusability requires four independent invariants:
 * 1. a session exists at all
 * 2. chain selection still matches the session's chain
 * 3. token selection still matches the session's bound token id
 * 4. the review guard reports `ready` — wallet still bound, submit window
 *    still open
 *
 * If any single invariant breaks, callers must run the full atomic
 * checkout again to pick up fresh backend state; a stale reuse here
 * would silently broadcast against a session backend no longer accepts.
 *
 * @param params - Current modal session + selection + wallet state
 * @returns True iff the current session is still safe to hydrate without
 *   re-running `createAtomicCryptoCheckout`
 */
export function isExistingSessionReusable({
	session,
	selectedChainId,
	sessionTokenId,
	selectedToken,
	connectedAddress,
	sessionWalletAddress,
}: IsExistingSessionReusableParams): boolean {
	if (!session) return false;
	if (session.chainId !== selectedChainId) return false;
	if (!selectedToken || sessionTokenId !== selectedToken.tokenId) return false;

	return (
		getReviewSessionGuard({
			connectedAddress,
			sessionWalletAddress,
			submitDeadline: session.submitDeadline,
		}).kind === 'ready'
	);
}

/**
 * Inputs for deriving the `createAtomicCryptoCheckout` payload. Mirrors
 * the exact fields the modal captures at the bottom of `handleWalletReady`
 * just before the atomic checkout call.
 */
interface DeriveAtomicCheckoutInputArgs {
	raffleId: string;
	ticketQuantity: number;
	promoCode?: string;
	selectedChainId: number;
	walletAddress: Address;
	selectedToken: RaffleCryptoToken;
}

/**
 * Shapes the input object for `createAtomicCryptoCheckout`.
 *
 * Centralising the payload shape keeps the caller concerned only with the
 * decision logic — the field names and the token-id mapping stay in one
 * place so any backend contract change (e.g. token slug rename) surfaces
 * here, not scattered across the modal.
 *
 * @param args - Raffle + quantity + selection captured at checkout time
 * @returns The `AtomicCryptoCheckoutPayload` ready to pass to the action
 */
export function deriveAtomicCheckoutInput({
	raffleId,
	ticketQuantity,
	promoCode,
	selectedChainId,
	walletAddress,
	selectedToken,
}: DeriveAtomicCheckoutInputArgs): AtomicCryptoCheckoutPayload {
	return {
		raffleId,
		ticketQuantity,
		promoCode,
		chainId: selectedChainId,
		walletAddress,
		token: selectedToken.tokenId,
	};
}

/**
 * Discriminated outcome of the wallet-ready EIP-191 verification step.
 *
 * - `skip` — wallet already verified, move straight to session reuse/atomic checkout
 * - `verified` — fresh signature accepted + wallet list refetched
 * - `missing-user` — session shape without a user id (toast: sign in)
 * - `verify-failed` — backend rejected the signed payload (toast: wallet error)
 * - `flow-stale` — flow-version was invalidated mid-await; caller returns silently
 *
 * The caller matches on `kind` so every branch stays exhaustive and no
 * downstream atomic-checkout call runs past a failed or stale verification.
 */
export type HandleWalletReadyVerificationOutcome =
	| { kind: 'skip' }
	| { kind: 'verified' }
	| { kind: 'missing-user' }
	| { kind: 'verify-failed'; error: WalletErrorCode }
	| { kind: 'flow-stale' };

/**
 * Dependency-injected inputs for the wallet-ready verification helper.
 *
 * Keeping wagmi + service calls as injected callables lets this helper stay
 * pure at its boundary: every value it touches arrives via arguments, and
 * the caller owns react/wagmi lifetime. This is the minimum surface that
 * reproduces the original inline verification block from `handleWalletReady`.
 */
interface HandleWalletReadyEnsureVerifiedArgs {
	/** True when the connected address already appears in `GET /me/wallets`. */
	isWalletVerified: boolean;
	/** Authenticated user id required to derive the EIP-191 plaintext. */
	userId: string | null | undefined;
	/** Currently connected, checksummed EVM address. */
	checksummedAddress: Address;
	/** Flow-version captured at handler entry — re-checked after every await. */
	flowVersion: number;
	/** Returns true iff `flowVersion` is still the latest invalidation token. */
	isFlowCurrent: (flowVersion: number) => boolean;
	/** wagmi `signMessageAsync` — prompts the wallet for a personal_sign. */
	signMessage: (args: { message: string }) => Promise<string>;
	/** Server action posting the signed payload to `/me/wallets/verify`. */
	verify: (
		payload: VerifyWalletPayload,
	) => Promise<ServiceResponse<WalletResponse, WalletErrorCode>>;
	/** Refetches the cached wallets list so `isWalletVerified` flips to true. */
	refetchWallets: () => Promise<unknown>;
}

/**
 * Runs the EIP-191 verification step of `handleWalletReady`.
 *
 * Step order (matches the original inline block byte-for-byte):
 * 1. Short-circuit when the wallet is already verified.
 * 2. Guard the authenticated user id — missing id means no account to bind.
 * 3. Build the exact plaintext via `buildEipVerificationMessage`.
 * 4. Request a `personal_sign` from the connected wallet.
 * 5. Re-check `isFlowCurrent` before any persistence side-effect — a stale
 *    flow means the user closed the modal or started a newer attempt, and
 *    we must not let a dismissed signature persist server-side.
 * 6. POST to `/me/wallets/verify` with address + message + signature + ts.
 * 7. On success, refetch the wallets cache and re-check the flow version.
 *
 * @param args - Dependency-injected wagmi + service callables and state
 * @returns Outcome the caller matches on to decide toast/return/continue
 */
/**
 * Discriminated outcome of the atomic checkout call inside `handleWalletReady`.
 *
 * - `failed` — backend rejected the atomic checkout; caller shows error,
 *   optionally clears promo, transitions to the failure step.
 * - `zero-total` — promo covered the full amount and backend auto-completed
 *   the order. Caller celebrates, invokes `onSuccess`, closes the modal.
 * - `session` — the happy path: backend returned a crypto session to hydrate.
 *
 * Consolidating the three mutually-exclusive branches into one classifier
 * drops three independent `if`s from the caller's cyclomatic budget.
 */
export type HandleWalletReadyAtomicOutcome =
	| { kind: 'failed'; error: PaymentErrorCode; clearPromo: boolean }
	| { kind: 'zero-total' }
	| { kind: 'session'; session: CryptoCheckoutSession };

/**
 * Classifies a `createAtomicCryptoCheckout` result for `handleWalletReady`.
 *
 * Contract:
 * - result.success === false ⇒ `failed` (with `clearPromo` precomputed).
 * - result.success === true + session === null ⇒ `zero-total` ($0 order,
 *   backend auto-completed via promo coverage).
 * - result.success === true + session !== null ⇒ `session` (hydrate path).
 *
 * @param result - ServiceResponse returned by the atomic checkout action
 * @param shouldClearPromo - Injected predicate from `@/lib/checkout/error-messages`
 * @returns Discriminated outcome the caller matches on
 */
export function classifyWalletReadyAtomicOutcome(
	result: ServiceResponse<AtomicCryptoCheckoutResponse, PaymentErrorCode>,
	shouldClearPromo: (error: PaymentErrorCode) => boolean,
): HandleWalletReadyAtomicOutcome {
	if (!result.success) {
		return {
			kind: 'failed',
			error: result.error,
			clearPromo: shouldClearPromo(result.error),
		};
	}
	if (!result.data.session) return { kind: 'zero-total' };
	return { kind: 'session', session: result.data.session };
}

/**
 * Maps an exception thrown during the verification signing / atomic checkout
 * awaits to the human toast text shown to the user.
 *
 * Splitting this out keeps `handleWalletReady`'s catch block a single line
 * and isolates the `isUserRejection` knowledge from the modal.
 *
 * @param error - The exception caught by `handleWalletReady`
 * @param isUserRejection - Injected predicate from `@/lib/web3/errors`
 * @returns `{ tone, text }` — `tone` picks the toast variant, `text` the copy
 */
export function classifyWalletReadySigError(
	error: unknown,
	isUserRejection: (error: unknown) => boolean,
): { tone: 'info' | 'error'; text: string } {
	if (isUserRejection(error)) {
		return { tone: 'info', text: 'Signature cancelled.' };
	}
	return { tone: 'error', text: 'Signature failed. Please try again.' };
}

export async function handleWalletReadyEnsureVerified({
	isWalletVerified,
	userId,
	checksummedAddress,
	flowVersion,
	isFlowCurrent,
	signMessage,
	verify,
	refetchWallets,
}: HandleWalletReadyEnsureVerifiedArgs): Promise<HandleWalletReadyVerificationOutcome> {
	if (isWalletVerified) return { kind: 'skip' };
	if (!userId) return { kind: 'missing-user' };

	const timestamp = new Date().toISOString();
	const message = buildEipVerificationMessage({
		address: checksummedAddress,
		userId,
		timestamp,
	});

	const signature = await signMessage({ message });

	// Bail before the verify POST lands if the user has already closed the
	// modal or started a newer attempt. Without this guard, a dismissed
	// signature still persists the wallet link server-side — a silent
	// side-effect the user never consented to.
	if (!isFlowCurrent(flowVersion)) return { kind: 'flow-stale' };

	const result = await verify({
		address: checksummedAddress,
		message,
		signature,
		timestamp,
	});

	if (!result.success) return { kind: 'verify-failed', error: result.error };

	await refetchWallets();
	if (!isFlowCurrent(flowVersion)) return { kind: 'flow-stale' };

	return { kind: 'verified' };
}
