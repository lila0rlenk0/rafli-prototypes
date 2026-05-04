'use client';

import { Loader2, Sparkles, X } from 'lucide-react';
import {
	useState,
	type ChangeEvent,
	type FormEvent,
	type KeyboardEvent,
} from 'react';
import { toast } from 'sonner';

import { CreditCodeRedeemSuccessDialog } from '@/components/promo-code/credit-code-redeem-success-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getPromoErrorMessage } from '@/lib/checkout/error-messages';
import { cn } from '@/lib/class-names';
import { useRedeemCreditCode } from '@/services/promo-code/use-redeem-credit-code';
import {
	PROMO_CODE_MAX_LENGTH,
	PROMO_CODE_MIN_LENGTH,
	PROMO_CODE_REGEX,
} from '@/types/promo-code';

// Snapshot of the redeem-response fields the success dialog needs. We hold
// onto the original `code` (not just the BE-returned amount/balance) so the
// dialog can re-detect the Earnmax prefix without a second round-trip — the
// redeem endpoint doesn't echo a tier discriminator.
interface RedemptionSuccess {
	readonly code: string;
	readonly creditsGranted: string;
	readonly balanceAfter: string;
}

interface RedemptionFormProps {
	readonly code: string;
	readonly inlineError: string | null;
	readonly isPending: boolean;
	readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	readonly onChange: (event: ChangeEvent<HTMLInputElement>) => void;
	readonly onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
	readonly onCancel: () => void;
}

/**
 * Inline form rendered inside the redemption banner once expanded. Extracted
 * so `CreditCodeRedeem` keeps orchestration concerns (state, mutation wiring)
 * separate from the field markup.
 *
 * @returns Code input + Apply button + inline error / Cancel row.
 */
function RedemptionForm({
	code,
	inlineError,
	isPending,
	onSubmit,
	onChange,
	onKeyDown,
	onCancel,
}: RedemptionFormProps) {
	return (
		<form onSubmit={onSubmit} className="mt-4 flex flex-col gap-2">
			<div className="flex gap-2">
				<Input
					value={code}
					onChange={onChange}
					onKeyDown={onKeyDown}
					placeholder="XXXX-XXXX"
					disabled={isPending}
					autoFocus
					// `PROMO_CODE_MAX_LENGTH` (32) covers every shape the BE
					// accepts — host XXXX-XXXX, sequence-gated FIRSTDRAW-A7X9K2,
					// and Earnmax migration MAX-12345678-ABCDEF (19 chars).
					maxLength={PROMO_CODE_MAX_LENGTH}
					aria-label="Redemption code"
					aria-invalid={inlineError !== null}
					className={cn(
						'border-brand-dark h-11 rounded-full bg-white px-4 font-mono text-sm uppercase',
						inlineError &&
							'border-red-400 focus-visible:border-red-500 focus-visible:ring-red-100',
					)}
				/>
				<Button
					type="submit"
					size="lg"
					disabled={!code.trim() || isPending}
					className="shrink-0"
				>
					{isPending ? (
						<Loader2 className="size-4 animate-spin" aria-hidden />
					) : (
						'Apply'
					)}
				</Button>
			</div>
			{inlineError ? (
				<div className="flex items-center justify-between">
					<div className="text-destructive flex items-center gap-1.5 text-sm">
						<X className="size-3.5" aria-hidden />
						<span>{inlineError}</span>
					</div>
					<button
						type="button"
						onClick={onCancel}
						className="text-foreground/70 hover:text-foreground text-xs transition-colors"
					>
						Cancel
					</button>
				</div>
			) : null}
		</form>
	);
}

/**
 * Inline redemption affordance for credit-grant promo codes — lives inside
 * the profile page's credits card.
 *
 * Why split from `PromoCodeInput` (the raffle-checkout component): that one
 * is bound to a `raffleId` and emits `onValidCode` for the parent to apply
 * mid-checkout. Credit grants are account-scoped (no raffle) and the
 * mutation is fire-and-finish — there is no enclosing form to commit. Reusing
 * `PromoCodeInput` would force prop dummying, an unused validation step
 * (the BE has no `validate` endpoint for credit_grant), and a confusing
 * "Apply" copy that implies a pending discount.
 *
 * Three render states:
 *   - **Collapsed** → yellow banner mirroring the credits-card upsell shell
 *     (Why-pay-full-price / We-couldn't-charge-your-card) so the affordance
 *     reads as a peer to the subscription banners stacked nearby. The dark
 *     pill CTA reveals the form.
 *   - **Expanded** → input + Apply button rendered inside the same banner
 *     so the surface keeps shape while the user types. Enter submits;
 *     Escape (or the inline Cancel beside an error) collapses.
 *   - **Pending** → Apply button shows a spinner; field is disabled to
 *     prevent double-submits while React Query has the request in flight.
 *
 * Error display: deterministic business errors render inline under the
 * field (matching `PromoCodeEntryField`); transient/network errors surface
 * via toast since they can be retried with the same code. The split is
 * carried by `getPromoErrorMessage` + the lookup of `network_error` /
 * `timeout_error` codes — anything outside the deterministic set is
 * treated as transient.
 *
 * On success: dismisses the field and opens `CreditCodeRedeemSuccessDialog`
 * with the granted amount + new balance. The dialog also receives the
 * canonical code so it can render the Earnmax welcome variant when the
 * code carries the `EMAX-` prefix. `useRedeemCreditCode` invalidates the
 * `['credits']` React-Query family (drives navbar pill + this card's
 * server-rendered values via the `revalidatePath('/profile')` in the
 * action) regardless of which copy variant the dialog shows.
 *
 * @returns Inline form for redeeming credit-grant codes.
 */
export function CreditCodeRedeem() {
	const [isExpanded, setIsExpanded] = useState(false);
	const [code, setCode] = useState('');
	const [inlineError, setInlineError] = useState<string | null>(null);
	// Lifted out of the redeem mutation's lifecycle so the success dialog can
	// outlive the in-flight request — `mutation.data` would clear if the user
	// triggered another redemption while the modal was open.
	const [success, setSuccess] = useState<RedemptionSuccess | null>(null);
	const mutation = useRedeemCreditCode();

	function reset() {
		setCode('');
		setInlineError(null);
		setIsExpanded(false);
	}

	function handleCodeChange(event: ChangeEvent<HTMLInputElement>) {
		// FE-only canonicalisation for UX — BE rejects lowercase rather than
		// silently casefolding (see `promoCodeStringSchema` docblock), so we
		// upper-case here before sending and the format guard below compares
		// the same canonical form the BE will validate.
		setCode(event.target.value.toUpperCase());
		if (inlineError) setInlineError(null);
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const trimmed = code.trim();

		// Format guard — bail before the network round trip if the shape is
		// obviously wrong. Mirrors the BE `promoCodeFieldSchema` bearer-token
		// grammar (8-32 chars, charset A-Z/0-9/dash) — see `PROMO_CODE_REGEX`
		// in `@/types/promo-code` for the rationale on not regex-ing canonical
		// shapes here.
		if (
			trimmed.length < PROMO_CODE_MIN_LENGTH ||
			trimmed.length > PROMO_CODE_MAX_LENGTH ||
			!PROMO_CODE_REGEX.test(trimmed)
		) {
			setInlineError(
				`Enter a valid code (${PROMO_CODE_MIN_LENGTH}-${PROMO_CODE_MAX_LENGTH} characters: letters, digits, dashes).`,
			);
			return;
		}

		mutation.mutate(
			{ code: trimmed },
			{
				onSuccess(data) {
					// Capture `trimmed` (the BE-canonical uppercased form)
					// alongside the BE response so the success dialog can
					// detect the Earnmax migration prefix (`MAX-...`) without
					// a follow-up call. We collapse the inline form first so
					// the modal sits over a clean card — reopening the
					// affordance after the user dismisses the modal requires
					// another click on the trigger.
					reset();
					setSuccess({
						code: trimmed,
						creditsGranted: data.creditsGranted,
						balanceAfter: data.balanceAfter,
					});
				},
				onError(error) {
					const message = getPromoErrorMessage(error.code);
					// Network / timeout / unknown errors are retryable with the
					// same code — surface as toast so the user keeps the input
					// they typed and can hit Apply again. Deterministic business
					// errors (not-found, expired, already-redeemed, etc.) belong
					// inline because the user must change the code to recover.
					if (
						error.code === 'network_error' ||
						error.code === 'timeout_error' ||
						error.code === 'unknown_error'
					) {
						toast.error(message);
						return;
					}
					setInlineError(message);
				},
			},
		);
	}

	function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (event.key === 'Escape') {
			reset();
		}
	}

	return (
		<>
			<div className="bg-brand-yellow border-brand-dark flex flex-col items-start justify-between gap-6 rounded-3xl border p-8 sm:flex-row sm:items-center">
				<div className="text-foreground flex flex-col gap-2">
					<h4 className="font-clash-display text-headline-md flex items-center gap-2 font-semibold">
						<Sparkles className="size-5" aria-hidden />
						Have a redemption code?
					</h4>
					<p className="text-body-sm">
						Apply your code in seconds — credits land straight in your balance.
					</p>
					{isExpanded ? (
						<RedemptionForm
							code={code}
							inlineError={inlineError}
							isPending={mutation.isPending}
							onSubmit={handleSubmit}
							onChange={handleCodeChange}
							onKeyDown={handleKeyDown}
							onCancel={reset}
						/>
					) : null}
				</div>
				{!isExpanded ? (
					<Button
						type="button"
						size="lg"
						onClick={() => setIsExpanded(true)}
						className="font-semibold sm:shrink-0"
					>
						Redeem code
					</Button>
				) : null}
			</div>
			{/*
			 * Dialog stays mounted so Radix can run its open/close transition
			 * — `success` drives `open`, and clearing it on close drops the
			 * snapshot so a stale value can't re-open the modal. Default
			 * strings keep the dialog body type-safe while `open=false`; the
			 * user never sees them because Radix only portals the content
			 * during the open + exit-animation window.
			 */}
			<CreditCodeRedeemSuccessDialog
				open={success !== null}
				onOpenChange={open => {
					if (!open) setSuccess(null);
				}}
				code={success?.code ?? ''}
				creditsGranted={success?.creditsGranted ?? '0'}
				balanceAfter={success?.balanceAfter ?? '0'}
			/>
		</>
	);
}
