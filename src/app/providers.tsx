'use client';

import { MixpanelProvider } from '@/providers/mixpanel-provider';

export function Providers({ children }: { children: React.ReactNode }) {
	return <MixpanelProvider>{children}</MixpanelProvider>;
}
