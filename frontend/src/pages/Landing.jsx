import LandingNavbar from '../components/landing/LandingNavbar';
import HeroSection from '../components/landing/HeroSection';
import DoctorTrustSection from '../components/landing/DoctorTrustSection';
import HowItWorksSection from '../components/landing/HowItWorksSection';
import BenefitsSection from '../components/landing/BenefitsSection';
import PatientExperienceSection from '../components/landing/PatientExperienceSection';
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
    <div className="min-h-screen bg-canvas">
      <LandingNavbar />
      <main>
        <HeroSection />
        <DoctorTrustSection />
        <HowItWorksSection />
        <BenefitsSection />
        <PatientExperienceSection />
        <PrescriptionSection />
        <AccessAnywhereSection />
        <SecuritySection />
        <EmergencyNotice />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
