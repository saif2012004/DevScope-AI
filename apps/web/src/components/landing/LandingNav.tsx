"use client";

import { motion, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Logo } from "@/components/shared/Logo";

export function LandingNav() {
  const { scrollY } = useScroll();
  const blur = useTransform(scrollY, [0, 80], [4, 14]);
  const bgOpacity = useTransform(scrollY, [0, 80], [0.4, 0.8]);

  return (
    <motion.nav
      style={{
        backdropFilter: useTransform(blur, (v) => `blur(${v}px)`),
        backgroundColor: useTransform(bgOpacity, (o) => `hsl(240 10% 4% / ${o})`),
      }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06]"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Logo size="md" />
        <div className="hidden items-center gap-8 md:flex">
          {[
            { href: "#features", label: "Features" },
            { href: "#how-it-works", label: "How it works" },
            { href: "#pricing", label: "Pricing" },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-white/60 transition-colors hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/sign-in"
            className="hidden text-sm text-white/60 transition-colors hover:text-white sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="group inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-[hsl(263_85%_65%)] to-[hsl(263_85%_50%)] px-4 py-2 text-sm font-medium text-white shadow-[0_8px_30px_-12px_hsl(263_85%_60%/0.7)] transition-all hover:shadow-[0_12px_40px_-12px_hsl(263_85%_60%/0.9)]"
          >
            Get started
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
