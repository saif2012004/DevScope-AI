"use client";

import { FadeIn } from "@/components/motion/primitives";

const items = [
  { name: "Voyage AI", desc: "Code-optimized embeddings" },
  { name: "Groq", desc: "Fast LLM inference" },
  { name: "FAISS", desc: "Vector similarity search" },
  { name: "Next.js 16", desc: "React framework" },
];

export function LandingTech() {
  return (
    <section className="border-t border-white/10 px-6 py-20">
      <div className="mx-auto max-w-4xl text-center">
        <FadeIn>
          <h2 className="mb-12 text-2xl font-bold text-white">
            Built with <span className="text-gradient">best-in-class AI</span>
          </h2>
        </FadeIn>
        <div className="flex flex-wrap justify-center gap-3">
          {items.map((item, i) => (
            <FadeIn key={item.name} delay={i * 0.06}>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-4 text-left backdrop-blur transition-colors hover:bg-white/[0.06]">
                <p className="text-sm font-medium text-white">{item.name}</p>
                <p className="mt-1 text-xs text-white/40">{item.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
