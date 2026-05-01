import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BarChart2,
  Check,
  CheckCircle2,
  FileText,
  GitBranch,
  GitPullRequest,
  MessageSquare,
  Sparkles,
  X,
  Zap,
} from "lucide-react";

// ── Feature card ──────────────────────────────────────────────────────────────

function FeatureCard({
  icon,
  title,
  description,
  features,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/[0.08] hover:border-white/20 transition-all duration-300">
      <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
      <p className="text-white/60 text-sm leading-relaxed mb-6">{description}</p>
      <ul className="space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-purple-400 flex-shrink-0" />
            <span className="text-white/60 text-sm">{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Pricing feature row ───────────────────────────────────────────────────────

function PricingFeature({
  included,
  label,
  iconColor,
}: {
  included: boolean;
  label: string;
  iconColor: string;
}) {
  return (
    <li className="flex items-center gap-3">
      {included ? (
        <Check size={16} className={iconColor} />
      ) : (
        <X size={16} className="text-white/20" />
      )}
      <span
        className={
          included ? "text-white/70 text-sm" : "text-white/30 text-sm line-through"
        }
      >
        {label}
      </span>
    </li>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="bg-[#0A0A0A] text-white min-h-screen">

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">DS</span>
            </div>
            <span className="text-white font-semibold text-lg">
              DevScope<span className="text-purple-400 font-bold"> AI</span>
            </span>
          </div>

          {/* Center links */}
          <div className="hidden md:flex gap-8">
            <a href="#features" className="text-white/60 hover:text-white text-sm transition-colors">Features</a>
            <a href="#how-it-works" className="text-white/60 hover:text-white text-sm transition-colors">How It Works</a>
            <a href="#pricing" className="text-white/60 hover:text-white text-sm transition-colors">Pricing</a>
          </div>

          {/* Right actions */}
          <div className="flex items-center">
            <Link href="/sign-in" className="text-white/60 hover:text-white text-sm transition-colors">
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-4 py-2 text-sm font-medium transition-colors ml-4"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="min-h-screen flex items-center justify-center text-center relative overflow-hidden pt-16">
        {/* Radial gradient background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(127,119,221,0.12)_0%,_transparent_70%)] pointer-events-none z-0" />

        <div className="relative z-10 max-w-4xl mx-auto px-6">
          {/* Badge pill */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm text-white/80 mb-8">
            ✨ AI-Powered Developer Productivity
          </div>

          {/* H1 */}
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6">
            Understand Any Codebase
            <br />
            Instantly with <span className="text-purple-400">AI</span>
          </h1>

          {/* Subheading */}
          <p className="text-xl text-white/60 max-w-2xl mx-auto leading-relaxed mb-10">
            DevScope AI indexes your GitHub repositories and lets you ask questions,
            generate documentation, review pull requests, and estimate task complexity
            — all powered by AI that actually understands your code.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/sign-up"
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-8 py-4 text-lg font-medium transition-colors"
            >
              Start for Free →
            </Link>
            <a
              href="https://github.com/saif2012004"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-full px-8 py-4 text-lg transition-colors"
            >
              View on GitHub
            </a>
          </div>

          {/* Trust line */}
          <p className="text-sm text-white/40 mt-6">
            Free to start · No credit card required · Built with Gemini + Voyage AI
          </p>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-xs font-medium tracking-widest text-purple-400 uppercase">
            FEATURES
          </p>
          <h2 className="text-center mt-4 mb-16 text-4xl font-bold text-white">
            Everything you need to master any codebase
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FeatureCard
              icon={<MessageSquare className="text-purple-400" size={24} />}
              title="Ask Anything About Your Code"
              description="Chat with your codebase in natural language. Ask how authentication works, find where a bug might be, or understand a complex algorithm — DevScope AI retrieves the exact relevant code and explains it."
              features={[
                "Semantic search across all files",
                "Source citations with file and line numbers",
                "Follows conversation context",
                "Streams answers in real time",
              ]}
            />
            <FeatureCard
              icon={<FileText className="text-purple-400" size={24} />}
              title="Generate Complete Documentation"
              description="One click generates a full README, API reference, architecture overview, and contributing guide — all grounded in your actual code, not hallucinated."
              features={[
                "6-section structured documentation",
                "Downloadable as Markdown",
                "Project overview and architecture",
                "API reference from actual routes",
              ]}
            />
            <FeatureCard
              icon={<GitPullRequest className="text-purple-400" size={24} />}
              title="AI Pull Request Reviews"
              description="Paste any GitHub PR URL and get a thorough code review in seconds. DevScope AI compares the diff against your indexed codebase to find bugs, security issues, and style inconsistencies."
              features={[
                "Detect bugs and security issues",
                "Consistency with existing patterns",
                "Approve or Request Changes verdict",
                "Copy review to post on GitHub",
              ]}
            />
            <FeatureCard
              icon={<BarChart2 className="text-purple-400" size={24} />}
              title="Estimate Task Complexity"
              description="Describe a feature and get a detailed effort estimate: affected files, risks, implementation steps, and time ranges — all based on your actual codebase structure."
              features={[
                "1-10 effort score with time estimate",
                "Affected files with change types",
                "Risk analysis with mitigations",
                "Step-by-step implementation plan",
              ]}
            />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-32 px-6 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-medium tracking-widest text-purple-400 uppercase">
            HOW IT WORKS
          </p>
          <h2 className="text-center mt-4 text-4xl font-bold text-white">
            From codebase to insights in minutes
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            {/* Step 1 */}
            <div className="text-center">
              <p className="text-8xl font-bold text-white/5 mb-4 leading-none">1</p>
              <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <GitBranch className="text-purple-400" size={28} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Connect Your Repository</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Paste a GitHub URL. DevScope AI fetches all source files, splits them into
                semantic chunks, and indexes them using Voyage AI&apos;s code-optimized embedding model.
              </p>
              <span className="inline-block mt-4 bg-white/10 rounded-full px-3 py-1 text-xs text-white/50">
                ~30 seconds for most repos
              </span>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <p className="text-8xl font-bold text-white/5 mb-4 leading-none">2</p>
              <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <Zap className="text-purple-400" size={28} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">AI Indexes Everything</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Your code is stored in a FAISS vector database. Every function, class, and
                module becomes searchable by meaning — not just keyword matching.
              </p>
              <span className="inline-block mt-4 bg-white/10 rounded-full px-3 py-1 text-xs text-white/50">
                voyage-code-3 embeddings
              </span>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <p className="text-8xl font-bold text-white/5 mb-4 leading-none">3</p>
              <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="text-purple-400" size={28} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Ask, Generate, Review</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Chat with your code, generate docs, review PRs, and estimate complexity. All
                powered by Gemini 2.0 Flash with your actual codebase as context.
              </p>
              <span className="inline-block mt-4 bg-white/10 rounded-full px-3 py-1 text-xs text-white/50">
                Gemini 2.0 Flash
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-32 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-medium tracking-widest text-purple-400 uppercase">
            PRICING
          </p>
          <h2 className="mt-4 text-4xl font-bold text-white">
            Simple, transparent pricing
          </h2>
          <p className="text-white/60 mt-4 mb-16">Start free. Upgrade when you&apos;re ready.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-left">
              <p className="text-sm font-medium text-white/60 mb-2">Free</p>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold text-white">$0</span>
                <span className="text-white/40 text-lg">/month</span>
              </div>
              <p className="text-white/50 text-sm mb-8 mt-1">Get started for free</p>
              <ul className="space-y-3">
                <PricingFeature included label="1 GitHub repository" iconColor="text-white/40" />
                <PricingFeature included label="50 AI messages per month" iconColor="text-white/40" />
                <PricingFeature included label="Codebase Q&A chat" iconColor="text-white/40" />
                <PricingFeature included label="Basic documentation" iconColor="text-white/40" />
                <PricingFeature included={false} label="PR Review Bot" iconColor="text-white/40" />
                <PricingFeature included={false} label="Complexity Scorer" iconColor="text-white/40" />
              </ul>
              <Link
                href="/sign-up"
                className="mt-8 block w-full text-center border border-white/20 text-white rounded-xl py-3 hover:bg-white/10 transition-colors"
              >
                Get Started Free
              </Link>
            </div>

            {/* Pro card */}
            <div className="bg-purple-600/20 border-2 border-purple-500/50 rounded-2xl p-8 text-left relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-medium px-4 py-1 rounded-full whitespace-nowrap">
                Most Popular
              </span>
              <p className="text-sm font-medium text-purple-300 mb-2">Pro</p>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold text-white">$12</span>
                <span className="text-white/60 text-lg">/month</span>
              </div>
              <p className="text-white/60 text-sm mb-8 mt-1">Everything you need</p>
              <ul className="space-y-3">
                <PricingFeature included label="Unlimited repositories" iconColor="text-purple-400" />
                <PricingFeature included label="Unlimited AI messages" iconColor="text-purple-400" />
                <PricingFeature included label="Codebase Q&A chat" iconColor="text-purple-400" />
                <PricingFeature included label="Auto documentation generation" iconColor="text-purple-400" />
                <PricingFeature included label="PR Review Bot" iconColor="text-purple-400" />
                <PricingFeature included label="Complexity Scorer" iconColor="text-purple-400" />
                <PricingFeature included label="Priority support" iconColor="text-purple-400" />
              </ul>
              <Link
                href="/sign-up"
                className="mt-8 block w-full text-center bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-3 font-medium transition-colors"
              >
                Start Pro Trial
              </Link>
            </div>
          </div>

          <p className="text-center text-white/30 text-sm mt-8">
            All plans include: No setup fees · Cancel anytime · Works with any public GitHub repo
          </p>
        </div>
      </section>

      {/* ── TECH STACK ── */}
      <section className="py-20 px-6 border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-12">Built with best-in-class AI</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { name: "Voyage AI", desc: "Code-optimized embeddings" },
              { name: "Gemini 2.0 Flash", desc: "Fast generation" },
              { name: "FAISS", desc: "Vector similarity search" },
              { name: "Next.js 14", desc: "React framework" },
            ].map(({ name, desc }) => (
              <div
                key={name}
                className="bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-left"
              >
                <p className="text-white font-medium text-sm">{name}</p>
                <p className="text-white/40 text-xs mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between gap-8">
            {/* Left */}
            <div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">DS</span>
                </div>
                <span className="text-white font-semibold text-lg">
                  DevScope<span className="text-purple-400 font-bold"> AI</span>
                </span>
              </div>
              <p className="text-white/40 text-sm mt-3 max-w-xs">
                AI-powered developer productivity suite for modern engineering teams.
              </p>
            </div>

            {/* Right */}
            <div className="flex gap-12">
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wider mb-4 font-medium">
                  Product
                </p>
                <a href="#features" className="text-white/40 hover:text-white text-sm block mb-2 transition-colors">Features</a>
                <a href="#pricing" className="text-white/40 hover:text-white text-sm block mb-2 transition-colors">Pricing</a>
                <a
                  href="https://github.com/saif2012004"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/40 hover:text-white text-sm block mb-2 transition-colors"
                >
                  GitHub
                </a>
              </div>
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wider mb-4 font-medium">
                  Links
                </p>
                <Link href="/sign-in" className="text-white/40 hover:text-white text-sm block mb-2 transition-colors">Sign In</Link>
                <Link href="/sign-up" className="text-white/40 hover:text-white text-sm block mb-2 transition-colors">Get Started</Link>
                <Link href="/dashboard" className="text-white/40 hover:text-white text-sm block mb-2 transition-colors">Dashboard</Link>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/10 mt-12 pt-8 text-center">
            <p className="text-white/30 text-xs">
              © 2026 DevScope AI · Built by Saif ur Rehman · FAST NUCES Islamabad
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
