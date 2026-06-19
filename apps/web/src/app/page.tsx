import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { LandingFeatureGrid } from "@/components/landing/LandingFeatureGrid";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingHowItWorks } from "@/components/landing/LandingHowItWorks";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { LandingTech } from "@/components/landing/LandingTech";

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <LandingNav />
      <LandingHero />
      <LandingFeatureGrid />
      <LandingHowItWorks />
      <LandingPricing />
      <LandingTech />

      <LandingFooter />
    </div>
  );
}
