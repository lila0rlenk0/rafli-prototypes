'use client';

import { MixpanelProvider } from '@/providers/mixpanel-provider';
import { QueryProvider } from '@/providers/query-provider';

export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<QueryProvider>
			<MixpanelProvider>{children}</MixpanelProvider>
		</QueryProvider>
	);
}
