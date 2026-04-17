import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { FEATURE_FLAGS } from '@/lib/feature-flags';

interface MessagesLayoutProps {
	children: ReactNode;
}

/**
 * Feature-flag gate for the entire `/messages` surface.
 *
 * When `CHAT_ENABLED` is off we render the global 404 page instead of a
 * redirect — `notFound()` is indistinguishable from a missing route, so
 * an attacker probing for a pre-launch feature can't tell whether chat
 * simply doesn't exist yet or is hidden behind a flag.
 *
 * No additional layout chrome here: the `(protected)` parent already
 * provides `AuthGuard`, `NotificationStoreProvider`, `ChatStoreProvider`,
 * and the shared `Navbar`.
 */
export default function MessagesLayout({ children }: MessagesLayoutProps) {
	if (!FEATURE_FLAGS.CHAT_ENABLED) notFound();
	return children;
}
