import { createJSONStorage, persist } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

// --- State & Action interfaces ---
// Separated so the provider can type the initial state without actions.
//
// Why this store exists:
// - GDPR Art. 6 and the UK PECR require explicit opt-in before non-essential
//   cookies or analytics scripts can load. The MixpanelProvider previously
//   initialized the SDK unconditionally on mount; this store is the new
//   gate — Mixpanel reads `status === 'accepted'` before calling `init()`.
// - The banner lives in the root layout so visitors land on the choice
//   immediately. Persistence via zustand/middleware's localStorage adapter
//   means the choice survives reloads across sessions and browsers with
//   localStorage enabled.
//
// Status values:
// - 'pending'  — user has not yet chosen; banner should be visible.
// - 'accepted' — user opted in; analytics may load.
// - 'rejected' — user opted out; only essential cookies are set.

export const COOKIE_CONSENT_STATUS = {
	PENDING: 'pending',
	ACCEPTED: 'accepted',
	REJECTED: 'rejected',
} as const;

export type CookieConsentStatus =
	(typeof COOKIE_CONSENT_STATUS)[keyof typeof COOKIE_CONSENT_STATUS];

export interface CookieConsentStoreState {
	readonly status: CookieConsentStatus;
}

export interface CookieConsentStoreActions {
	readonly accept: () => void;
	readonly reject: () => void;
}

export type CookieConsentStore = CookieConsentStoreState &
	CookieConsentStoreActions;

/** localStorage key — must be stable across deploys to avoid re-prompting users */
const PERSIST_STORAGE_KEY = 'raffly-cookie-consent';

/** Default state — pending until the user makes an explicit choice */
export const defaultInitState: Readonly<CookieConsentStoreState> = {
	status: COOKIE_CONSENT_STATUS.PENDING,
};

/**
 * Creates a vanilla Zustand store for cookie consent, persisted to
 * localStorage so the choice survives reloads. Mirrors the user-store
 * pattern used elsewhere in the project — vanilla store + provider +
 * typed selector hook.
 *
 * @param initState - Initial state for the store
 * @returns Zustand vanilla store instance with persistence middleware
 */
export function createCookieConsentStore(
	initState: CookieConsentStoreState = defaultInitState,
) {
	return createStore<CookieConsentStore>()(
		persist(
			set => ({
				...initState,

				accept: () => {
					set({ status: COOKIE_CONSENT_STATUS.ACCEPTED });
				},

				reject: () => {
					set({ status: COOKIE_CONSENT_STATUS.REJECTED });
				},
			}),
			{
				name: PERSIST_STORAGE_KEY,
				storage: createJSONStorage(() => {
					// No-op storage for SSR and restricted browsing contexts
					// (private mode, iframes, embedded WebViews) where
					// localStorage access throws SecurityError — mirrors
					// user-store resilience so the banner always renders
					// in degraded contexts (safer default).
					const noopStorage = {
						getItem: () => null,
						setItem: () => {},
						removeItem: () => {},
					};
					if (typeof window === 'undefined') return noopStorage;
					try {
						const probe = '__raffly_cookie_probe__';
						localStorage.setItem(probe, '1');
						localStorage.removeItem(probe);
						return localStorage;
					} catch {
						return noopStorage;
					}
				}),
			},
		),
	);
}
