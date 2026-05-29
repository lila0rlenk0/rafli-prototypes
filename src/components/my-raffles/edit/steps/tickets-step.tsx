'use client';

import { AdvancedSettingsSection } from '@/components/my-raffles/create/sections/advanced-settings-section';
import { CryptoConfigSection } from '@/components/my-raffles/create/sections/crypto-config-section';
import { CheckInQuestionFieldset } from '@/components/my-raffles/shared/tickets/check-in-question-fieldset';
import { EntriesFieldset } from '@/components/my-raffles/shared/tickets/entries-fieldset';
import { TicketsStepActions } from '@/components/my-raffles/shared/tickets/actions';
import { TimePeriodFieldset } from '@/components/my-raffles/shared/tickets/time-period-fieldset';
import { useTicketsStepDerived } from '@/components/my-raffles/shared/tickets/use-derived';
import { useTicketsStepActions } from '@/components/my-raffles/shared/tickets/use-tickets-step-actions';

import { useEditForm } from '../form-provider';
import { PromoCodesSection } from '../promo-codes-section';
import {
	PriceLockedBanner,
	StartDateLockedBanner,
} from './tickets-lock-banners';

/**
 * Edit-mode Tickets step. Mirrors the create composer but forwards the
 * `restrictions` context to the shared fieldsets so locked inputs disable
 * correctly, and wires the edit-only lock banners.
 *
 * @returns Tickets step JSX for the edit wizard.
 */
export function TicketsStep() {
	const { form, nextStep, restrictions, questions } = useEditForm();
	const { watch, setValue } = form;

	// Watch fields that drive derived UI + the Clear-All enablement.
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

	// Clear All — edit respects `restrictions.startDateLocked` (live raffle
	// can't rewind its start) and `restrictions.priceLocked` (price frozen
	// once entries sold). Edit has no pending promo codes to clear.
	function handleClearAll() {
		if (!restrictions.startDateLocked) {
			setValue('startDate', '');
			setValue('startTime', '');
		}
		setValue('endDate', '');
		setValue('endTime', '');
		if (!restrictions.priceLocked) {
			setValue('pricePerTicket', NaN);
		}
		setValue('numberOfWinners', NaN);
		setValue('minParticipants', 0);
		setValue('maxParticipants', 0);
		setValue('checkInQuestion', '');
		setValue('acceptsCrypto', false);
		setValue('cryptoChainIds', []);
		setValue('cryptoTokens', []);
		setValue('cryptoTokenPricing', []);
		// Reset advanced config to backend-equivalent defaults so the next
		// save produces a wire payload matching "fields omitted".
		setValue('minTickets', 0);
		setValue('maxTicketsPerUser', 0);
		setValue('winnerSelectionMode', 'unique_user');
		setValue('enrollmentMode', 'standard');
		setValue('xShareTicketsEnabled', false);
	}

	const canClear = Boolean(
		startDate ||
		startTime ||
		endDate ||
		endTime ||
		(pricePerTicket && pricePerTicket > 0) ||
		(numberOfWinners && numberOfWinners > 0) ||
		(minParticipants && minParticipants > 0) ||
		(maxParticipants && maxParticipants > 0) ||
		checkInQuestion,
	);

	return (
		<div className="flex w-full flex-col gap-6">
			<TimePeriodFieldset
				form={form}
				todayDate={derived.todayDate}
				isDateRangeValid={derived.isDateRangeValid}
				isEndDateWithin6Months={derived.isEndDateWithin6Months}
				isStartDateToday={derived.isStartDateToday}
				cardPadding="p-6"
				restrictions={{ startLocked: restrictions.startDateLocked }}
				lockBanner={
					restrictions.startDateLocked ? <StartDateLockedBanner /> : null
				}
			/>
			<EntriesFieldset
				form={form}
				cardPadding="p-6"
				restrictions={{ priceLocked: restrictions.priceLocked }}
				priceLockedBanner={<PriceLockedBanner />}
			/>
			<CryptoConfigSection
				acceptsCrypto={form.watch('acceptsCrypto')}
				cryptoChainIds={form.watch('cryptoChainIds')}
				cryptoTokens={form.watch('cryptoTokens')}
				cryptoTokenPricing={form.watch('cryptoTokenPricing')}
				onFieldChange={(field, value) =>
					form.setValue(field, value, { shouldDirty: true })
				}
			/>
			<AdvancedSettingsSection
				minTickets={form.watch('minTickets')}
				maxTicketsPerUser={form.watch('maxTicketsPerUser')}
				winnerSelectionMode={form.watch('winnerSelectionMode')}
				enrollmentMode={form.watch('enrollmentMode')}
				xShareTicketsEnabled={form.watch('xShareTicketsEnabled')}
				onMinTicketsChange={value =>
					form.setValue('minTickets', value, { shouldDirty: true })
				}
				onMaxTicketsPerUserChange={value =>
					form.setValue('maxTicketsPerUser', value, { shouldDirty: true })
				}
				onWinnerSelectionModeChange={value =>
					form.setValue('winnerSelectionMode', value, { shouldDirty: true })
				}
				onEnrollmentModeChange={value =>
					form.setValue('enrollmentMode', value, { shouldDirty: true })
				}
				onXShareTicketsEnabledChange={value =>
					form.setValue('xShareTicketsEnabled', value, { shouldDirty: true })
				}
			/>
			<PromoCodesSection />
			<CheckInQuestionFieldset
				form={form}
				questions={questions}
				selectedQuestion={derived.selectedQuestion}
				cardPadding="p-6"
			/>
			<TicketsStepActions
				onContinue={handleContinue}
				onClearAll={handleClearAll}
				canClear={canClear}
			/>
		</div>
	);
}
