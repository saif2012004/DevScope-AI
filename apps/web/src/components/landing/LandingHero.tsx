"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { ArrowRight, Github, Sparkles } from "lucide-react";

import { AnimatedGridBg, GradientText } from "@/components/motion/primitives";

export function LandingHero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16 text-center">
      <AnimatedGridBg />

      <div className="relative z-10 mx-auto max-w-4xl px-6">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/80 backdrop-blur"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-[hsl(263_85%_65%)] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[hsl(263_85%_65%)]" />
          </span>
          <Sparkles className="h-3 w-3 text-[hsl(263_85%_75%)]" />
          AI-powered developer productivity
        </motion.div>

        {/* H1 */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl"
        >
          <span className="text-gradient">Understand any codebase</span>
          <br />
          <span className="text-white">instantly with </span>
          <GradientText>AI</GradientText>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-white/60 md:text-xl"
        >
          DevScope AI indexes your GitHub repositories and lets you ask questions,
          generate documentation, review pull requests, and estimate task complexity —
          all powered by AI that actually understands your code.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-wrap justify-center gap-4"
        >
          <Link
            href="/sign-up"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-b from-[hsl(263_85%_65%)] to-[hsl(263_85%_50%)] px-7 py-3.5 text-base font-medium text-white shadow-[0_15px_50px_-12px_hsl(263_85%_60%/0.8)] transition-all hover:shadow-[0_20px_60px_-12px_hsl(263_85%_60%/1)]"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
            Start for free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="https://github.com/saif2012004"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-7 py-3.5 text-base font-medium text-white backdrop-blur transition-colors hover:bg-white/[0.08]"
          >
            <Github className="h-4 w-4" />
            View on GitHub
          </a>
        </motion.div>

        {/* Trust */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="mt-6 text-sm text-white/40"
        >
          Free to start · No credit card required · Built with Groq + Voyage AI
        </motion.p>

        {/* Floating preview card */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto mt-16 max-w-3xl"
        >
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-white/15 via-white/5 to-transparent" />
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[hsl(240_10%_6%)]/80 p-5 backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-400/70" />
              <span className="h-3 w-3 rounded-full bg-yellow-400/70" />
              <span className="h-3 w-3 rounded-full bg-green-400/70" />
              <span className="ml-3 text-xs text-white/40">devscope.ai · chat</span>
            </div>
            <div className="space-y-3 text-left">
              <div className="flex justify-end">
                <div className="max-w-md rounded-2xl rounded-br-md bg-[hsl(263_85%_60%/0.18)] px-4 py-2.5 text-sm text-white/90">
                  How does authentication work in this repo?
                </div>
              </div>
              <div className="flex justify-start">
                <div className="max-w-lg rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white/80">
                  Auth uses Clerk middleware (<code className="rounded bg-white/10 px-1 py-0.5 text-xs">apps/api/src/middleware/auth.ts:14</code>). Every protected route runs through{" "}
                  <code className="rounded bg-white/10 px-1 py-0.5 text-xs">requireAuth()</code> which verifies the JWT and injects{" "}
                  <code className="rounded bg-white/10 px-1 py-0.5 text-xs">req.userId</code>…
                  <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-[hsl(263_85%_65%)]" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
