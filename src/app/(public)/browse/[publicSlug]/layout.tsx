import { headers } from 'next/headers';
import type { ReactNode } from 'react';

import { extractWagmiCookie } from '@/lib/web3/extract-wagmi-cookie';
import { Web3Provider } from '@/providers/web3-provider';

interface RaffleDetailLayoutProps {
	children: ReactNode;
}

/**
 * Route-scoped Web3 boundary — mounts wagmi + Reown AppKit only for the
 * raffle detail segment, the single route that renders crypto checkout
 * (`CryptoBuyButton` inside `TicketPurchaseCard`). Keeps the Reown bundle
 * off every other route (admin, pricing, messages, profile, landing, etc).
 *
 * SSR cookie boundary: reads the request `Cookie` header and forwards only
 * the `wagmi.store` entry across the Server→Client boundary. Props crossing
 * that boundary are serialized into the RSC flight payload and embedded in
 * the initial HTML, so forwarding the raw header would leak the httpOnly
 * `raffly-token` JWT to client JS. See `extract-wagmi-cookie.ts`.
 *
 * Navigation persistence: wagmi's `cookieStorage` round-trips state through
 * the request cookie, so leaving the segment and returning rehydrates the
 * same connected wallet without a fresh prompt. `createAppKit` is a module-
 * scope side effect that fires once on first import of `web3-provider.tsx`
 * (Reown's singleton contract); later remounts reuse the cached module.
 *
 * `headers()` opts this segment into dynamic rendering — already the case
 * because the detail page reads `getSession()`, so no new dynamic cost.
 */
export default async function RaffleDetailLayout({
	children,
}: RaffleDetailLayoutProps) {
	const headersList = await headers();
	const wagmiCookie = extractWagmiCookie(headersList.get('cookie'));

	return <Web3Provider wagmiCookie={wagmiCookie}>{children}</Web3Provider>;
}
