import type { StateStorage } from 'zustand/middleware';

/**
 * No-op storage used when real localStorage is unavailable — SSR, incognito,
 * embedded WebViews, and browser contexts where `localStorage.setItem` throws
 * `SecurityError`. Satisfies zustand's `StateStorage` contract without
 * persisting anything.
 */
const noopStorage: StateStorage = {
	getItem: () => null,
	setItem: () => {},
	removeItem: () => {},
};

/**
 * Probes localStorage at runtime and returns it when writable; otherwise
 * returns a no-op storage. The probe is required because `typeof window`
 * passes in sandboxed contexts where `localStorage.setItem` still throws.
 *
 * Shared across every zustand `persist` store so restricted browsing
 * contexts never crash on first mutation.
 *
 * @returns localStorage when writable, a no-op storage otherwise.
 */
export function safeLocalStorage(): StateStorage {
	if (typeof window === 'undefined') return noopStorage;
	try {
		const probe = '__zustand_storage_probe__';
		localStorage.setItem(probe, '1');
		localStorage.removeItem(probe);
		return localStorage;
	} catch {
		return noopStorage;
	}
}
