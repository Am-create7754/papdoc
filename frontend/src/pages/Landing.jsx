import LandingNavbar from '../components/landing/LandingNavbar';
import HeroSection from '../components/landing/HeroSection';
import DoctorTrustSection from '../components/landing/DoctorTrustSection';
import HowItWorksSection from '../components/landing/HowItWorksSection';
import HealthTipsSection from '../components/landing/HealthTipsSection';
import PrescriptionSection from '../components/landing/PrescriptionSection';
import AccessAnywhereSection from '../components/landing/AccessAnywhereSection';
import SecuritySection from '../components/landing/SecuritySection';
import EmergencyNotice from '../components/landing/EmergencyNotice';
import FinalCTA from '../components/landing/FinalCTA';
import LandingFooter from '../components/landing/LandingFooter';

// This page owns the ONE background for the whole landing page (bg-canvas, set here and
// nowhere else). Section components below only render content — text, cards, images — and
// must not add their own section-level background colors, gradients, or glow overlays.
// The single deliberate exception is FinalCTA's glow, which matches the approved prototype.
export default function Landing() {
  return (
    <div className="relative min-h-screen bg-canvas overflow-hidden">
      {/* Ambient background system — ties the whole page together as one continuous dark
          canvas instead of a flat fill: a faint top-down gold wash plus two very low-opacity
          glow fields at different scroll depths, and a subtle vertical tone shift so nothing
          reads as a hard, single-color slab. Purely decorative — pinned behind everything at
          z-0, never intercepts clicks. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-x-0 top-0 h-[70vh] bg-[radial-gradient(ellipse_120%_60%_at_50%_0%,rgba(200,155,60,0.06),transparent_65%)]" />
        <div className="absolute top-[38%] left-1/2 -translate-x-1/2 w-[70rem] h-[70rem] max-w-none rounded-full bg-primary/[0.035] blur-[160px]" />
        <div className="absolute top-[78%] right-[8%] w-[42rem] h-[42rem] max-w-none rounded-full bg-primary/[0.03] blur-[130px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface-muted/25 to-transparent" />
      </div>

      <div className="relative z-10">
        <LandingNavbar />
        <main>
          <HeroSection />
          <DoctorTrustSection />
          <HowItWorksSection />
          <HealthTipsSection />
          <PrescriptionSection />
          <AccessAnywhereSection />
          <SecuritySection />
          <EmergencyNotice />
          <FinalCTA />
        </main>
        <LandingFooter />
      </div>
    </div>
  );
}
