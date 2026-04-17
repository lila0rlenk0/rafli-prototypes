import { Footer } from '@/components/landing/footer';
import { CTASection } from '@/components/landing/cta-section';
import { HeroSection } from '@/components/landing/hero-section';
import { HostSection } from '@/components/landing/host-section';
import { Navbar } from '@/components/landing/navbar';
import { ParticipantSection } from '@/components/landing/participant-section';
import { TrustSection } from '@/components/landing/trust-section';

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
