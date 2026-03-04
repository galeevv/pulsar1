import { LandingDetailsSection } from "@/components/landing/landing-details-section";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHeroSection } from "@/components/landing/landing-hero-section";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingHeader />
      <main className="mx-auto w-full max-w-[1200px] px-6 pb-24">
        <LandingHeroSection />
        <LandingDetailsSection />
      </main>
    </div>
  );
}
