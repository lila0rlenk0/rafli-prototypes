'use client';

import { HeroSection } from './hero-section';
import { Navbar } from './navbar';
import { TrustSection } from './trust-section';
import { ParticipantSection } from './participant-section';
import { HostSection } from './host-section';
import { CTASection } from './cta-section';
import { Footer } from './footer';

/**
 * Landing page for Rafli - the raffle platform
 *
 * Showcases the platform's features, benefits for participants and hosts,
 * and provides call-to-action buttons to enter the app.
 */
export default function LandingPage() {
	return (
		<div className="bg-background min-h-screen">
			<Navbar />
			<main>
				<HeroSection />
				<TrustSection />
				<ParticipantSection />
				<HostSection />
				<CTASection />
			</main>
			<Footer />
		</div>
	);
}
