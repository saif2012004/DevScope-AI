"use client";

import { Check, X } from "lucide-react";
import Link from "next/link";

import { FadeIn } from "@/components/motion/primitives";

type Feature = { included: boolean; label: string };

function FeatureRow({ included, label, pro }: Feature & { pro?: boolean }) {
  return (
    <li className="flex items-center gap-3">
      {included ? (
        <Check className={pro ? "h-4 w-4 text-[hsl(263_85%_75%)]" : "h-4 w-4 text-white/50"} />
      ) : (
        <X className="h-4 w-4 text-white/20" />
      )}
      <span
        className={
          included
            ? "text-sm text-white/75"
            : "text-sm text-white/30 line-through"
        }
      >
        {label}
      </span>
    </li>
  );
}

const FREE_FEATURES: Feature[] = [
  { included: true, label: "1 GitHub repository" },
  { included: true, label: "50 AI messages per month" },
  { included: true, label: "Codebase Q&A chat" },
  { included: true, label: "Basic documentation" },
  { included: false, label: "PR Review Bot" },
  { included: false, label: "Complexity Scorer" },
];

const PRO_FEATURES: Feature[] = [
  { included: true, label: "Unlimited repositories" },
  { included: true, label: "Unlimited AI messages" },
  { included: true, label: "Codebase Q&A chat" },
  { included: true, label: "Auto documentation generation" },
  { included: true, label: "PR Review Bot" },
  { included: true, label: "Complexity Scorer" },
  { included: true, label: "Priority support" },
];

export function LandingPricing() {
  const free = FREE_FEATURES;
  const pro = PRO_FEATURES;
  return (
    <section id="pricing" className="relative px-6 py-32">
      <div className="mx-auto max-w-3xl text-center">
        <FadeIn>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[hsl(263_85%_75%)]">
            Pricing
          </p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
            Simple, <span className="text-gradient">transparent</span> pricing
          </h2>
          <p className="mt-4 text-white/60">
            Start free. Upgrade when you&apos;re ready.
          </p>
        </FadeIn>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2">
          <FadeIn delay={0.05}>
            <div className="card-hover h-full rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-left">
              <p className="mb-2 text-sm font-medium text-white/60">Free</p>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold text-white">$0</span>
                <span className="text-lg text-white/40">/month</span>
              </div>
              <p className="mb-8 mt-1 text-sm text-white/50">Get started for free</p>
              <ul className="space-y-3">
                {free.map((f) => (
                  <FeatureRow key={f.label} {...f} />
                ))}
              </ul>
              <Link
                href="/sign-up"
                className="mt-8 block w-full rounded-xl border border-white/15 py-3 text-center text-white transition-colors hover:bg-white/[0.06]"
              >
                Get started free
              </Link>
            </div>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="relative h-full overflow-hidden rounded-2xl p-[1px] text-left">
              {/* Animated gradient border */}
              <div
                className="absolute inset-0 opacity-90"
                style={{
                  background:
                    "conic-gradient(from 0deg, hsl(263 85% 65%), hsl(199 89% 65%), hsl(290 90% 70%), hsl(263 85% 65%))",
                  animation: "shimmer-rotate 8s linear infinite",
                }}
              />
              <div className="relative h-full rounded-[15px] bg-[hsl(240_10%_5%)] p-8">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-b from-[hsl(263_85%_65%)] to-[hsl(263_85%_50%)] px-4 py-1 text-xs font-medium text-white shadow-[0_10px_30px_-10px_hsl(263_85%_60%/0.8)]">
                  Most popular
                </span>
                <p className="mb-2 text-sm font-medium text-[hsl(263_85%_75%)]">Pro</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-white">$12</span>
                  <span className="text-lg text-white/60">/month</span>
                </div>
                <p className="mb-8 mt-1 text-sm text-white/60">Everything you need</p>
                <ul className="space-y-3">
                  {pro.map((f) => (
                    <FeatureRow key={f.label} {...f} pro />
                  ))}
                </ul>
                <Link
                  href="/sign-up"
                  className="mt-8 block w-full rounded-xl bg-gradient-to-b from-[hsl(263_85%_65%)] to-[hsl(263_85%_50%)] py-3 text-center font-medium text-white shadow-[0_10px_30px_-10px_hsl(263_85%_60%/0.8)] transition-all hover:shadow-[0_15px_40px_-10px_hsl(263_85%_60%/1)]"
                >
                  Start Pro trial
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>

        <p className="mt-8 text-center text-sm text-white/30">
          All plans include: No setup fees · Cancel anytime · Works with any public GitHub repo
        </p>
      </div>
    </section>
  );
}
