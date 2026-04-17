import type { Metadata } from 'next';
import { Suspense, type ComponentProps, type ReactNode } from 'react';

import { PublicNavbar } from '@/components/ui/public-navbar';
import { ScreenLoader } from '@/components/ui/screen-loader';
import { env } from '@/env/server';
import { getSession } from '@/lib/auth/session';
import { parsePermissions } from '@/lib/permissions';
import { ChatStoreProvider } from '@/providers/chat-store-provider';
import { NotificationStoreProvider } from '@/providers/notification-store-provider';
import { UserStoreProvider } from '@/providers/user-store-provider';

export const metadata: Metadata = {
	title: 'Past Winners | Rafli',
	description:
		'Browse the most recent Rafli winners — every draw is verifiable on-chain. Display names are masked to protect winner privacy.',
	alternates: {
		canonical: `${env.APP_URL}/past-winners`,
	},
	openGraph: {
		title: 'Past Winners | Rafli',
		description:
			'See who recently won on Rafli. Every draw is provably fair and verifiable on-chain.',
		url: `${env.APP_URL}/past-winners`,
		siteName: 'Rafli',
		type: 'website',
		locale: 'en_US',
	},
	robots: {
		index: true,
		follow: true,
	},
};

interface PastWinnersLayoutProps {
	children: ReactNode;
}

/**
 * Past Winners Layout Content
 *
 * Internal async component isolated behind Suspense — `getSession` reads cookies
 * which would block streaming if invoked at the layout level directly. Pattern
 * mirrors browse/host/how-it-works layouts.
 */
async function PastWinnersLayoutContent({ children }: PastWinnersLayoutProps) {
	const session = await getSession();
	const isAuthenticated = !!session;

	const permissions = isAuthenticated
		? parsePermissions(session?.user?.permissions)
		: [];

	const content = (
		<PublicNavbar isAuthenticated={isAuthenticated}>{children}</PublicNavbar>
	);

	if (isAuthenticated) {
		return (
			<UserStoreProvider permissions={permissions}>
				<NotificationStoreProvider>
					<ChatStoreProvider>{content}</ChatStoreProvider>
				</NotificationStoreProvider>
			</UserStoreProvider>
		);
	}

	return content;
}

/**
 * DecorativeShapes — same blurred brand-color rectangles as the how-it-works
 * layout, kept consistent so users moving between public marketing surfaces
 * feel a continuous brand. Uses the shared `--color-accent-*` tokens (blue
 * #c4edff, green #beffdb, yellow #f6ff8b) so a brand retune propagates here
 * automatically instead of drifting from the rest of the system.
 */
function DecorativeShapes(props: ComponentProps<'div'>) {
	return (
		<div aria-hidden {...props}>
			<div className="bg-accent-blue absolute -top-20 -left-40 h-[400px] w-[500px] -rotate-12 rounded-3xl opacity-50 blur-2xl" />
			<div className="bg-accent-green absolute -top-60 -left-20 h-[400px] w-[500px] rotate-[25deg] rounded-3xl opacity-50 blur-2xl" />
			<div className="bg-accent-yellow absolute -top-40 left-10 h-[350px] w-[450px] rotate-45 rounded-3xl opacity-50 blur-2xl" />
		</div>
	);
}

/**
 * Layout for /past-winners — public marketing surface listing recent winners.
 */
export default function PastWinnersLayout({
	children,
}: PastWinnersLayoutProps) {
	return (
		<main className="relative min-h-screen">
			<DecorativeShapes className="pointer-events-none fixed top-0 left-0 z-[15] origin-top-left scale-[.65]" />
			<Suspense fallback={<ScreenLoader />}>
				<PastWinnersLayoutContent>{children}</PastWinnersLayoutContent>
			</Suspense>
		</main>
	);
}
