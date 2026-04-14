'use client';

import { Eye, EyeOff, Lock } from 'lucide-react';
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from 'react';

import { Button } from '@/components/ui/button';

// Context carries a single boolean + toggle. Scoped per submission detail page —
// reveal state must not persist across navigations, so no URL/storage backing.
interface PiiRevealContextValue {
	revealed: boolean;
	toggle: () => void;
}

const PiiRevealContext = createContext<PiiRevealContextValue | null>(null);

/**
 * Hook for consuming the reveal state inside the provider tree.
 * Throws outside a provider to catch wiring mistakes at render time
 * rather than silently rendering PII with the default `false` value.
 */
function usePiiReveal(): PiiRevealContextValue {
	const ctx = useContext(PiiRevealContext);
	if (!ctx) {
		throw new Error(
			'PII reveal components must be used within PiiRevealProvider',
		);
	}
	return ctx;
}

interface PiiRevealProviderProps {
	children: ReactNode;
}

/**
 * Provider for the "hide PII by default" gate on the admin KYC review page.
 *
 * Why: admin reviewers incidentally open many submissions; shoulder-surfing and
 * screen recordings could leak sensitive identity data (names, emails, ID docs)
 * they never intended to inspect. Requiring an explicit reveal gesture documents
 * intent and avoids casual PII exposure.
 *
 * @returns Context wrapper — place at the root of the detail page layout
 */
export function PiiRevealProvider({ children }: PiiRevealProviderProps) {
	const [revealed, setRevealed] = useState(false);

	// useCallback: stable reference prevents every PiiContent consumer from
	// re-rendering when an unrelated parent re-renders (context value identity).
	const toggle = useCallback(function toggleReveal() {
		setRevealed(previous => !previous);
	}, []);

	// useMemo: stable context value identity — avoids cascading re-renders of
	// every consumer whenever the provider's parent re-renders.
	const value = useMemo<PiiRevealContextValue>(
		() => ({ revealed, toggle }),
		[revealed, toggle],
	);

	return (
		<PiiRevealContext.Provider value={value}>
			{children}
		</PiiRevealContext.Provider>
	);
}

/**
 * Toggle button for the reveal gate. Placed near the top of the detail page
 * so the admin can flip the state before scrolling to any PII region.
 *
 * @returns Button that flips the reveal state
 */
export function PiiRevealToggle() {
	const { revealed, toggle } = usePiiReveal();

	return (
		<Button
			type="button"
			variant={revealed ? 'ghost' : 'outline'}
			size="sm"
			onClick={toggle}
			aria-pressed={revealed}
		>
			{revealed ? (
				<>
					<EyeOff data-icon="inline-start" />
					Hide PII
				</>
			) : (
				<>
					<Eye data-icon="inline-start" />
					Reveal PII
				</>
			)}
		</Button>
	);
}

interface PiiContentProps {
	children: ReactNode;
	/**
	 * Placeholder to render while PII is hidden. Kept explicit so each call site
	 * can mirror the layout shape of the revealed content (prevents jarring
	 * jumps when the admin toggles reveal).
	 */
	fallback: ReactNode;
}

/**
 * Conditionally renders its children only when the reveal gate is open.
 * Wrap any node containing PII with this consumer; provide a `fallback` that
 * preserves the surrounding layout shape while content is hidden.
 *
 * @returns Either the real children or the masked fallback
 */
export function PiiContent({ children, fallback }: PiiContentProps) {
	const { revealed } = usePiiReveal();
	return revealed ? <>{children}</> : <>{fallback}</>;
}

/**
 * Generic masked placeholder card body — subtle, explains *why* content is
 * hidden so admins don't mistake the gate for a data-loading failure.
 *
 * @returns Centered lock icon with brief copy
 */
export function PiiHiddenPlaceholder({ label }: { label: string }) {
	return (
		<div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-10 text-center">
			<Lock className="text-muted-foreground size-5" aria-hidden="true" />
			<p className="text-muted-foreground text-sm">
				{label} is hidden. Click <span className="font-medium">Reveal PII</span>{' '}
				above to view.
			</p>
		</div>
	);
}
