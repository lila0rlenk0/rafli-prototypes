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
 * Server Component — no data fetching, purely compositional.
 * All interactivity (GSAP animations, mobile menu) is handled by child Client Components.
 *
 * Section order: Navbar > Hero > Trust > Participant > Host > CTA > Footer.
 * Each section is a co-located sibling file in (landing)/ for colocation.
 *
 * @returns Full landing page with all sections composed in order
 */
export default function LandingPage() {
	return (
		<div className="min-h-screen bg-[#f9f8f4]">
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
