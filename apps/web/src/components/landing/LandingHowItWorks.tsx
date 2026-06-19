"use client";

import { GitBranch, Sparkles, Zap, type LucideIcon } from "lucide-react";

import { FadeIn, Stagger, StaggerItem } from "@/components/motion/primitives";

type Step = {
  n: string;
  icon: LucideIcon;
  title: string;
  body: string;
  tag: string;
};

const STEPS: Step[] = [
  {
    n: "1",
    icon: GitBranch,
    title: "Connect Your Repository",
    body: "Paste a GitHub URL. DevScope AI fetches all source files, splits them into semantic chunks, and indexes them using Voyage AI's code-optimized embedding model.",
    tag: "~30 seconds for most repos",
  },
  {
    n: "2",
    icon: Zap,
    title: "AI Indexes Everything",
    body: "Your code is stored in a FAISS vector database. Every function, class, and module becomes searchable by meaning — not just keyword matching.",
    tag: "voyage-code-3 embeddings",
  },
  {
    n: "3",
    icon: Sparkles,
    title: "Ask, Generate, Review",
    body: "Chat with your code, generate docs, review PRs, and estimate complexity. All powered by Groq with your actual codebase as context.",
    tag: "Groq · llama-3.3",
  },
];

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="relative px-6 py-32">
      <div className="absolute inset-0 bg-dots opacity-20" aria-hidden />
      <div className="relative mx-auto max-w-5xl">
        <FadeIn className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[hsl(263_85%_75%)]">
            How it works
          </p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
            From codebase to insights in <span className="text-gradient">minutes</span>
          </h2>
        </FadeIn>

        <Stagger className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <StaggerItem key={s.n}>
                <div className="relative text-center">
                  <p className="select-none text-[8rem] font-bold leading-none text-white/[0.04]">
                    {s.n}
                  </p>
                  <div className="mx-auto -mt-12 mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-[hsl(263_85%_60%/0.15)] backdrop-blur">
                    <Icon className="h-7 w-7 text-[hsl(263_85%_75%)]" />
                  </div>
                  <h3 className="mb-3 text-xl font-semibold text-white">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-white/60">{s.body}</p>
                  <span className="mt-4 inline-block rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/50">
                    {s.tag}
                  </span>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}
