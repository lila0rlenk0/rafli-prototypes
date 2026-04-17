import { describe, expect, test } from 'bun:test';

import { getCryptoBuyButtonUiState } from './crypto-buy-button-state';

describe('getCryptoBuyButtonUiState', () => {
	test('prioritizes confirming state over all other states', () => {
		const state = getCryptoBuyButtonUiState({
			isConfirming: true,
			isConnected: true,
			canOpenConnectModal: true,
			disabled: true,
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
		});

		expect(state.label).toBe('Connect wallet to buy');
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
		});

		expect(state.label).toBe('Buy with crypto');
		expect(state.showLoadingIcon).toBe(false);
		expect(state.isDisabled).toBe(false);
		expect(state.variant).toBe('connected');
	});
});
