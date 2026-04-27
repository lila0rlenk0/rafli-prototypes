import { describe, expect, test } from 'bun:test';

import { getCryptoBuyButtonUiState } from './state';

describe('getCryptoBuyButtonUiState', () => {
	test('prioritizes confirming state over all other states', () => {
		const state = getCryptoBuyButtonUiState({
			isConfirming: true,
			isConnected: true,
			canOpenConnectModal: true,
			disabled: true,
			isAccessPassAcknowledged: true,
		});

		expect(state.label).toBe('Transaction pending...');
		expect(state.showLoadingIcon).toBe(true);
		expect(state.isDisabled).toBe(false);
		expect(state.variant).toBe('confirming');
	});

	test('shows preparing state when wallet modal is not ready', () => {
		const state = getCryptoBuyButtonUiState({
			isConfirming: false,
			isConnected: false,
			canOpenConnectModal: false,
			disabled: false,
			isAccessPassAcknowledged: true,
		});

		expect(state.label).toBe('Preparing wallet...');
		expect(state.showLoadingIcon).toBe(true);
		expect(state.isDisabled).toBe(true);
		expect(state.variant).toBe('preparing');
	});

	test('shows connect state when wallet modal is ready', () => {
		const state = getCryptoBuyButtonUiState({
			isConfirming: false,
			isConnected: false,
			canOpenConnectModal: true,
			disabled: false,
			isAccessPassAcknowledged: true,
		});

		expect(state.label).toBe('One Time Purchase with Crypto');
		expect(state.showLoadingIcon).toBe(false);
		expect(state.isDisabled).toBe(false);
		expect(state.variant).toBe('ready-to-connect');
	});

	test('shows buy state when connected', () => {
		const state = getCryptoBuyButtonUiState({
			isConfirming: false,
			isConnected: true,
			canOpenConnectModal: true,
			disabled: false,
			isAccessPassAcknowledged: true,
		});

		expect(state.label).toBe('One Time Purchase with Crypto');
		expect(state.showLoadingIcon).toBe(false);
		expect(state.isDisabled).toBe(false);
		expect(state.variant).toBe('connected');
	});

	// Access Pass acknowledgment is a legal consent gate — the user must tick
	// the disclaimer checkbox in the purchase card before any paid checkout
	// CTA is clickable. The crypto path is a paid path, so the same gate
	// applies. The state machine treats un-acknowledged as a disabled variant
	// distinct from preparing/ready-to-connect so the label can explain *why*
	// the button is greyed out (actionable: "tick the checkbox") rather than
	// leaving the user to guess.
	describe('access pass acknowledgment gate', () => {
		test('disables connected state when acknowledgment is missing', () => {
			const state = getCryptoBuyButtonUiState({
				isConfirming: false,
				isConnected: true,
				canOpenConnectModal: true,
				disabled: false,
				isAccessPassAcknowledged: false,
			});

			expect(state.isDisabled).toBe(true);
			expect(state.label).toBe('Acknowledge terms to continue');
			expect(state.variant).toBe('needs-acknowledgment');
		});

		test('disables ready-to-connect state when acknowledgment is missing', () => {
			const state = getCryptoBuyButtonUiState({
				isConfirming: false,
				isConnected: false,
				canOpenConnectModal: true,
				disabled: false,
				isAccessPassAcknowledged: false,
			});

			expect(state.isDisabled).toBe(true);
			expect(state.label).toBe('Acknowledge terms to continue');
			expect(state.variant).toBe('needs-acknowledgment');
		});

		test('confirming state bypasses acknowledgment — tx already on-chain', () => {
			// Once a transaction has been signed, the user has already consented
			// and the chain state is out of our control. Gating the "Transaction
			// pending..." view on the checkbox would strand the user mid-flow.
			const state = getCryptoBuyButtonUiState({
				isConfirming: true,
				isConnected: true,
				canOpenConnectModal: true,
				disabled: false,
				isAccessPassAcknowledged: false,
			});

			expect(state.variant).toBe('confirming');
			expect(state.isDisabled).toBe(false);
		});

		test('preparing state bypasses acknowledgment — wallet not ready', () => {
			// Preparing is a pre-interactive state driven by wallet SDK
			// initialization, not by user intent. The acknowledgment check only
			// matters once the user can actually click through to checkout.
			const state = getCryptoBuyButtonUiState({
				isConfirming: false,
				isConnected: false,
				canOpenConnectModal: false,
				disabled: false,
				isAccessPassAcknowledged: false,
			});

			expect(state.variant).toBe('preparing');
		});
	});
});
