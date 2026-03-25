import { cookies } from 'next/headers';

import { ProvidersClient } from './providers-client';

interface ProvidersProps {
	children: React.ReactNode;
}

/**
 * wagmi persists its SSR hydration snapshot under this cookie key.
 * Duplicated from `@/lib/web3/config` to avoid importing a client-only module
 * (getDefaultConfig runs at module scope) into this server component.
 */
const WAGMI_COOKIE_KEY = 'wagmi.store';

/**
 * Root Providers Server Wrapper.
 *
 * Reads only wagmi's persisted SSR cookie and forwards that single value into
 * the client provider tree. Never serialize the full request cookie header into
 * client props — auth/session cookies must stay server-only.
 *
 * @returns client provider tree with wagmi SSR state hydrated
 */
export async function Providers({ children }: ProvidersProps) {
	const wagmiCookieValue =
		(await cookies()).get(WAGMI_COOKIE_KEY)?.value ?? null;

	return (
		<ProvidersClient wagmiCookieValue={wagmiCookieValue}>
			{children}
		</ProvidersClient>
	);
}
