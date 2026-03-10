'use client';

import { MixpanelProvider } from '@/providers/mixpanel-provider';
import { QueryProvider } from '@/providers/query-provider';
import { Web3Provider } from '@/providers/web3-provider';

export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<QueryProvider>
			<Web3Provider>
				<MixpanelProvider>{children}</MixpanelProvider>
			</Web3Provider>
		</QueryProvider>
	);
}
