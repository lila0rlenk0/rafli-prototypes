'use client';

/**
 * Mixpanel Provider
 *
 * Handles: initialization, user identification
 * Autocapture handles: page views, clicks, scrolls, forms (configured in mixpanel-client)
 */

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { identify, initMixpanel, reset } from '@/lib/analytics/mixpanel-client';
import { AUTH_COOKIES } from '@/lib/auth/config';
import { authUserSchema, type AuthUser } from '@/types/auth';

/**
 * Parse user from session cookie with validation
 */
function getUserFromCookie(): AuthUser | null {
	if (typeof document === 'undefined') return null;

	const cookie = document.cookie
		.split('; ')
		.find(c => c.startsWith(`${AUTH_COOKIES.SESSION}=`));

	if (!cookie) return null;

	try {
		const value = decodeURIComponent(cookie.split('=')[1]);
		const parsed: unknown = JSON.parse(value);
		return authUserSchema.parse(parsed);
	} catch {
		return null;
	}
}

interface MixpanelProviderProps {
	children: React.ReactNode;
}

export function MixpanelProvider({ children }: MixpanelProviderProps) {
	const pathname = usePathname();
	const initialized = useRef(false);
	const identifiedUserId = useRef<string | null>(null);

	// Initialize once
	useEffect(() => {
		if (initialized.current) return;
		initMixpanel();
		initialized.current = true;
	}, []);

	// Handle user identification based on session cookie
	useEffect(() => {
		if (!initialized.current) return;

		const user = getUserFromCookie();

		if (user && user.id !== identifiedUserId.current) {
			identify(user.id, {
				$email: user.email,
				$name: user.name,
				$avatar: user.image,
			});
			identifiedUserId.current = user.id;
		} else if (!user && identifiedUserId.current) {
			reset();
			identifiedUserId.current = null;
		}
	}, [pathname]);

	return <>{children}</>;
}
