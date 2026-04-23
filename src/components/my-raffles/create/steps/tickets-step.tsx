'use client';

import { CheckInQuestionFieldset } from '@/components/my-raffles/shared/tickets/check-in-question-fieldset';
import { EntriesFieldset } from '@/components/my-raffles/shared/tickets/entries-fieldset';
import { TicketsStepActions } from '@/components/my-raffles/shared/tickets/actions';
import { TimePeriodFieldset } from '@/components/my-raffles/shared/tickets/time-period-fieldset';
import { useTicketsStepDerived } from '@/components/my-raffles/shared/tickets/use-derived';
import { useTicketsStepActions } from '@/components/my-raffles/shared/tickets/use-tickets-step-actions';

import { useMultiStepForm } from '@/components/my-raffles/create/multi-step-form-provider';
import { CryptoConfigSection } from '@/components/my-raffles/create/sections/crypto-config-section';
import { PromoCodesSection } from '@/components/my-raffles/create/sections/promo-codes-section';

/**
 * Step 2 of the raffle creation wizard. Composes the shared Tickets-step
 * fieldsets (time period, entries, check-in question) with the create-only
 * crypto + promo-codes sections. No restrictions prop is passed to the
 * shared fieldsets — the create flow never locks fields.
 *
 * @returns Tickets step JSX for the create wizard.
 */
export function TicketsStep() {
	const {
		form,
		nextStep,
		questions,
		pendingPromoCodes,
		clearPendingPromoCodes,
	} = useMultiStepForm();
	const { watch, setValue } = form;

	// Watch fields that drive derived UI (validity messages, banners).
	const startDate = watch('startDate');
	const startTime = watch('startTime');
	const endDate = watch('endDate');
	const endTime = watch('endTime');
	const pricePerTicket = watch('pricePerTicket');
	const numberOfWinners = watch('numberOfWinners');
	const minParticipants = watch('minParticipants');
	const maxParticipants = watch('maxParticipants');
	const checkInQuestion = watch('checkInQuestion');

	const derived = useTicketsStepDerived({
		startDate,
		startTime,
		endDate,
		endTime,
		checkInQuestion,
		questions,
	});

	const { handleContinue } = useTicketsStepActions({
		form,
		onAdvance: nextStep,
	});

	// Clear All — create clears every step-owned field AND any pending promo
	// codes the user queued in the modal but never persisted server-side.
	function handleClearAll() {
		setValue('startDate', '');
		setValue('startTime', '');
		setValue('endDate', '');
		setValue('endTime', '');
		setValue('pricePerTicket', NaN);
		setValue('numberOfWinners', NaN);
		setValue('minParticipants', 0);
		setValue('maxParticipants', 0);
		setValue('checkInQuestion', '');
		// Reset crypto config to its default (accepts-crypto off, empty lists).
		setValue('acceptsCrypto', false);
		setValue('cryptoChainIds', []);
		setValue('cryptoTokens', []);
		setValue('cryptoTokenPricing', []);
		clearPendingPromoCodes();
	}

	// Enabled whenever any step-owned field has a non-default value — mirrors
	// the previous behavior: a single filled field unlocks Clear All.
	const canClear = Boolean(
		startDate ||
		startTime ||
		endDate ||
		endTime ||
		(pricePerTicket && pricePerTicket > 0) ||
		(numberOfWinners && numberOfWinners > 0) ||
		(minParticipants && minParticipants > 0) ||
		(maxParticipants && maxParticipants > 0) ||
		checkInQuestion ||
		pendingPromoCodes.length > 0,
	);

	return (
		<div className="flex w-full flex-col gap-8">
			<TimePeriodFieldset
				form={form}
				todayDate={derived.todayDate}
				isDateRangeValid={derived.isDateRangeValid}
				isEndDateWithin6Months={derived.isEndDateWithin6Months}
				isStartDateToday={derived.isStartDateToday}
				cardPadding="p-8"
			/>
			<EntriesFieldset form={form} cardPadding="p-8" />
			<CryptoConfigSection
				acceptsCrypto={form.watch('acceptsCrypto')}
				cryptoChainIds={form.watch('cryptoChainIds')}
				cryptoTokens={form.watch('cryptoTokens')}
				cryptoTokenPricing={form.watch('cryptoTokenPricing')}
				onFieldChange={(field, value) =>
					form.setValue(field, value, { shouldDirty: true })
				}
			/>
			<PromoCodesSection />
			<CheckInQuestionFieldset
				form={form}
				questions={questions}
				selectedQuestion={derived.selectedQuestion}
				cardPadding="p-8"
			/>
			<TicketsStepActions
				onContinue={handleContinue}
				onClearAll={handleClearAll}
				canClear={canClear}
				continueClassName="px-6"
			/>
		</div>
	);
}
