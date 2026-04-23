'use client';

import { RaffleCreatedModal } from '@/components/raffle/cards/created-modal';

import { RestoreDraftModal } from './restore-draft-modal';
import { SaveDraftModal } from './save-draft-modal';

interface CreatedRaffleInfo {
	publicSlug: string;
	raffleStartDate: string;
}

interface ProviderModalsProps {
	createdRaffle: CreatedRaffleInfo | null;
	isModalOpen: boolean;
	onModalOpenChange: (open: boolean) => void;
	showExitModal: boolean;
	onExitModalOpenChange: (open: boolean) => void;
	onStay: () => void;
	onSaveDraft: () => void;
	onLeaveWithoutSaving: () => void;
	showRestoreModal: boolean;
	onRestoreModalOpenChange: (open: boolean) => void;
	onContinueDraft: () => void;
	onStartFresh: () => void;
}

/**
 * Container for the three overlays the multi-step form provider owns —
 * raffle-created success, save-draft exit, and restore-draft prompts.
 * Collapsing them here keeps the provider JSX body focused on context
 * wiring.
 */
export function ProviderModals({
	createdRaffle,
	isModalOpen,
	onModalOpenChange,
	showExitModal,
	onExitModalOpenChange,
	onStay,
	onSaveDraft,
	onLeaveWithoutSaving,
	showRestoreModal,
	onRestoreModalOpenChange,
	onContinueDraft,
	onStartFresh,
}: ProviderModalsProps) {
	return (
		<>
			{createdRaffle ? (
				<RaffleCreatedModal
					publicSlug={createdRaffle.publicSlug}
					raffleStartDate={createdRaffle.raffleStartDate}
					open={isModalOpen}
					onOpenChange={onModalOpenChange}
				/>
			) : null}
			<SaveDraftModal
				open={showExitModal}
				onOpenChange={onExitModalOpenChange}
				onStay={onStay}
				onSaveDraft={onSaveDraft}
				onLeaveWithoutSaving={onLeaveWithoutSaving}
			/>
			<RestoreDraftModal
				open={showRestoreModal}
				onOpenChange={onRestoreModalOpenChange}
				onContinueDraft={onContinueDraft}
				onStartFresh={onStartFresh}
			/>
		</>
	);
}
