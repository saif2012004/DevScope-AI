"use client";

import {
  BarChart2,
  CheckCircle2,
  FileText,
  GitPullRequest,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

import { FadeIn, Stagger, StaggerItem } from "@/components/motion/primitives";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
  features: string[];
};

const FEATURES: Feature[] = [
  {
    icon: MessageSquare,
    title: "Ask Anything About Your Code",
    description:
      "Chat with your codebase in natural language. Ask how authentication works, find where a bug might be, or understand a complex algorithm — DevScope AI retrieves the exact relevant code and explains it.",
    features: [
      "Semantic search across all files",
      "Source citations with file and line numbers",
      "Follows conversation context",
      "Streams answers in real time",
    ],
  },
  {
    icon: FileText,
    title: "Generate Complete Documentation",
    description:
      "One click generates a full README, API reference, architecture overview, and contributing guide — all grounded in your actual code, not hallucinated.",
    features: [
      "6-section structured documentation",
      "Downloadable as Markdown",
      "Project overview and architecture",
      "API reference from actual routes",
    ],
  },
  {
    icon: GitPullRequest,
    title: "AI Pull Request Reviews",
    description:
      "Paste any GitHub PR URL and get a thorough code review in seconds. DevScope AI compares the diff against your indexed codebase to find bugs, security issues, and style inconsistencies.",
    features: [
      "Detect bugs and security issues",
      "Consistency with existing patterns",
      "Approve or Request Changes verdict",
      "Copy review to post on GitHub",
    ],
  },
  {
    icon: BarChart2,
    title: "Estimate Task Complexity",
    description:
      "Describe a feature and get a detailed effort estimate: affected files, risks, implementation steps, and time ranges — all based on your actual codebase structure.",
    features: [
      "1-10 effort score with time estimate",
      "Affected files with change types",
      "Risk analysis with mitigations",
      "Step-by-step implementation plan",
    ],
  },
];

export function LandingFeatureGrid() {
  return (
    <section id="features" className="relative px-6 py-32">
      <div className="mx-auto max-w-7xl">
        <FadeIn className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[hsl(263_85%_75%)]">
            Features
          </p>
          <h2 className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-bold tracking-tight text-white md:text-5xl">
            Everything you need to <span className="text-gradient">master any codebase</span>
          </h2>
        </FadeIn>

        <Stagger className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <StaggerItem key={f.title}>
                <div className="card-hover group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-8">
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                    <div className="absolute -top-20 left-1/2 h-40 w-2/3 -translate-x-1/2 rounded-full bg-[hsl(263_85%_60%/0.25)] blur-3xl" />
                  </div>
                  <div className="relative">
                    <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-[hsl(263_85%_60%/0.15)]">
                      <Icon className="h-5 w-5 text-[hsl(263_85%_75%)]" />
                    </div>
                    <h3 className="mb-3 text-xl font-semibold text-white">{f.title}</h3>
                    <p className="mb-6 text-sm leading-relaxed text-white/60">{f.description}</p>
                    <ul className="space-y-2">
                      {f.features.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(263_85%_70%)]" />
                          <span className="text-sm text-white/60">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}
