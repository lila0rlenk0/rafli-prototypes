import { cookies } from 'next/headers';

import { WAGMI_COOKIE_KEY } from '@/lib/web3/config';
import { ProvidersClient } from './providers-client';

interface ProvidersProps {
	children: React.ReactNode;
}

/**
 * Root Providers Server Wrapper
 *
 * Reads only wagmi's persisted SSR cookie and forwards that single value into
 * the client provider tree. Never serialize the full request cookie header into
 * client props — auth/session cookies must stay server-only.
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
