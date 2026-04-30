Build the public landing page for DevScope AI. This is the marketing site at the root URL that converts visitors to users. It must be polished and impressive enough to show to employers.

The landing page lives at /apps/web/src/app/page.tsx — replace the current content completely.
This page is publicly accessible. Authenticated users are already redirected to /dashboard by middleware — keep that behavior.

This is a Server Component — do NOT add 'use client' at the top.

=== DESIGN ===
Dark theme throughout:
- Background: #0A0A0A
- Text: white
- Brand accent: hsl(250 84% 54%) — the same --brand-purple CSS variable
- Use Tailwind classes for everything (no inline style tags except for the background color on the outer wrapper)
- Clean, spacious, generous padding between sections

=== SECTION 1 — NAVBAR ===

A fixed top navbar:
className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md"

Inner container: max-w-7xl mx-auto px-6 h-16 flex items-center justify-between

Left: Logo
- Small purple square (w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center)
- Inside: "DS" text in white text-sm font-bold
- Next to it: "DevScope" in white font-semibold text-lg + " AI" in text-purple-400 font-bold

Center (hidden on mobile, flex gap-8 on md+):
- "Features" — href="#features"
- "How It Works" — href="#how-it-works"
- "Pricing" — href="#pricing"
All as: text-white/60 hover:text-white text-sm transition-colors

Right:
- "Sign In" — href="/sign-in" — text-white/60 hover:text-white text-sm
- "Get Started Free" — href="/sign-up" — bg-purple-600 hover:bg-purple-700 text-white rounded-full px-4 py-2 text-sm font-medium transition-colors ml-4

=== SECTION 2 — HERO ===

className="min-h-screen flex items-center justify-center text-center relative overflow-hidden pt-16"

Background gradient div (absolute, inset-0, pointer-events-none, z-0):
className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(127,119,221,0.12)_0%,_transparent_70%)]"

Content (relative z-10, max-w-4xl mx-auto px-6):

Badge pill at top:
className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm text-white/80 mb-8"
Text: "✨ AI-Powered Developer Productivity"

H1 heading:
className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6"
"Understand Any Codebase"
Then on new line: "Instantly with " + span with className="text-purple-400" containing "AI"

Subheading paragraph:
className="text-xl text-white/60 max-w-2xl mx-auto leading-relaxed mb-10"
"DevScope AI indexes your GitHub repositories and lets you ask questions, generate documentation, review pull requests, and estimate task complexity — all powered by AI that actually understands your code."

CTA buttons (flex flex-wrap gap-4 justify-center):
Primary: href="/sign-up"
className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-8 py-4 text-lg font-medium transition-colors"
Text: "Start for Free →"

Secondary: href="https://github.com/saif2012004" target="_blank"
className="bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-full px-8 py-4 text-lg transition-colors"
Text: "View on GitHub"

Trust line below buttons:
className="text-sm text-white/40 mt-6"
"Free to start · No credit card required · Built with Gemini + Voyage AI"

=== SECTION 3 — FEATURES ===

id="features"
className="py-32 px-6"

Max width container: max-w-7xl mx-auto

Section label (text-center):
className="text-xs font-medium tracking-widest text-purple-400 uppercase"
"FEATURES"

Section heading (text-center mt-4 mb-16):
className="text-4xl font-bold text-white"
"Everything you need to master any codebase"

4 cards in a 2x2 grid:
className="grid grid-cols-1 md:grid-cols-2 gap-6"

Each card:
className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/8 hover:border-white/20 transition-all duration-300"

CARD 1 — AI Chat:
Icon container: className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-6"
Icon: MessageSquare className="text-purple-400" size={24}
Title: "Ask Anything About Your Code" — text-xl font-semibold text-white mb-3
Description: "Chat with your codebase in natural language. Ask how authentication works, find where a bug might be, or understand a complex algorithm — DevScope AI retrieves the exact relevant code and explains it."
className="text-white/60 text-sm leading-relaxed mb-6"
Feature list (space-y-2):
Each item: flex items-center gap-2, CheckCircle2 size={14} className="text-purple-400 flex-shrink-0", span text-white/60 text-sm
Items:
- "Semantic search across all files"
- "Source citations with file and line numbers"
- "Follows conversation context"
- "Streams answers in real time"

CARD 2 — Documentation:
Icon: FileText className="text-purple-400"
Title: "Generate Complete Documentation"
Description: "One click generates a full README, API reference, architecture overview, and contributing guide — all grounded in your actual code, not hallucinated."
Features:
- "6-section structured documentation"
- "Downloadable as Markdown"
- "Project overview and architecture"
- "API reference from actual routes"

CARD 3 — PR Review:
Icon: GitPullRequest className="text-purple-400"
Title: "AI Pull Request Reviews"
Description: "Paste any GitHub PR URL and get a thorough code review in seconds. DevScope AI compares the diff against your indexed codebase to find bugs, security issues, and style inconsistencies."
Features:
- "Detect bugs and security issues"
- "Consistency with existing patterns"
- "Approve or Request Changes verdict"
- "Copy review to post on GitHub"

CARD 4 — Complexity:
Icon: BarChart2 className="text-purple-400"
Title: "Estimate Task Complexity"
Description: "Describe a feature and get a detailed effort estimate: affected files, risks, implementation steps, and time ranges — all based on your actual codebase structure."
Features:
- "1-10 effort score with time estimate"
- "Affected files with change types"
- "Risk analysis with mitigations"
- "Step-by-step implementation plan"

=== SECTION 4 — HOW IT WORKS ===

id="how-it-works"
className="py-32 px-6 bg-white/[0.02]"

Container: max-w-5xl mx-auto

Section label + heading (centered, same pattern as Features):
Label: "HOW IT WORKS"
Heading: "From codebase to insights in minutes"

3 steps in a horizontal row (md:grid-cols-3 gap-8 mt-16, vertical on mobile):

Each step container: className="text-center"

Step number (decorative):
className="text-8xl font-bold text-white/5 mb-4 leading-none"
"1", "2", "3"

Icon circle:
className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mx-auto mb-4"
Icons: GitBranch, Zap, Sparkles — each className="text-purple-400" size={28}

Step title: text-xl font-semibold text-white mb-3
Step description: text-white/60 text-sm leading-relaxed
Step badge (small pill at bottom): className="inline-block mt-4 bg-white/10 rounded-full px-3 py-1 text-xs text-white/50"

Step 1:
Title: "Connect Your Repository"
Description: "Paste a GitHub URL. DevScope AI fetches all source files, splits them into semantic chunks, and indexes them using Voyage AI's code-optimized embedding model."
Badge: "~30 seconds for most repos"

Step 2:
Title: "AI Indexes Everything"
Description: "Your code is stored in a FAISS vector database. Every function, class, and module becomes searchable by meaning — not just keyword matching."
Badge: "voyage-code-3 embeddings"

Step 3:
Title: "Ask, Generate, Review"
Description: "Chat with your code, generate docs, review PRs, and estimate complexity. All powered by Gemini 2.0 Flash with your actual codebase as context."
Badge: "Gemini 2.0 Flash"

=== SECTION 5 — PRICING ===

id="pricing"
className="py-32 px-6"

Container: max-w-3xl mx-auto text-center

Section label + heading + subheading:
Label: "PRICING"
Heading: "Simple, transparent pricing"
Subheading: className="text-white/60 mt-4 mb-16"
"Start free. Upgrade when you're ready."

Two pricing cards side by side (grid grid-cols-1 md:grid-cols-2 gap-6):

FREE CARD:
className="bg-white/5 border border-white/10 rounded-2xl p-8 text-left"
- "Free" label: text-sm font-medium text-white/60 mb-2
- Price: "$0" text-5xl font-bold text-white + "/month" text-white/40 text-lg
- Tagline: "Get started for free" text-white/50 text-sm mb-8
- Feature list (space-y-3):
  Each with Check icon in white/40 for included, X icon in white/20 for excluded:
  ✓ 1 GitHub repository
  ✓ 50 AI messages per month
  ✓ Codebase Q&A chat
  ✓ Basic documentation
  ✗ PR Review Bot (text-white/30, line-through)
  ✗ Complexity Scorer (text-white/30, line-through)
- Button: href="/sign-up" className="mt-8 block w-full text-center border border-white/20 text-white rounded-xl py-3 hover:bg-white/10 transition-colors"
  Text: "Get Started Free"

PRO CARD (featured):
className="bg-purple-600/20 border-2 border-purple-500/50 rounded-2xl p-8 text-left relative"
"Most Popular" badge (absolute -top-3 left-1/2 -translate-x-1/2):
className="bg-purple-600 text-white text-xs font-medium px-4 py-1 rounded-full whitespace-nowrap"
- "Pro" label: text-sm font-medium text-purple-300 mb-2
- Price: "$12" text-5xl font-bold text-white + "/month" text-white/60 text-lg
- Tagline: "Everything you need" text-white/60 text-sm mb-8
- Feature list with Check icons in purple-400:
  ✓ Unlimited repositories
  ✓ Unlimited AI messages
  ✓ Codebase Q&A chat
  ✓ Auto documentation generation
  ✓ PR Review Bot
  ✓ Complexity Scorer
  ✓ Priority support
- Button: href="/sign-up" className="mt-8 block w-full text-center bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-3 font-medium transition-colors"
  Text: "Start Pro Trial"

Below the cards:
className="text-center text-white/30 text-sm mt-8"
"All plans include: No setup fees · Cancel anytime · Works with any public GitHub repo"

=== SECTION 6 — TECH STACK ===

className="py-20 px-6 border-t border-white/10"
Container: max-w-4xl mx-auto text-center

Heading: className="text-2xl font-bold text-white mb-12"
"Built with best-in-class AI"

4 tech badges in a flex flex-wrap justify-center gap-4:
Each badge: className="bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-left"
- Name: text-white font-medium text-sm
- Description: text-white/40 text-xs mt-1

Badges:
1. "Voyage AI" / "Code-optimized embeddings"
2. "Gemini 2.0 Flash" / "Fast generation"
3. "FAISS" / "Vector similarity search"
4. "Next.js 14" / "React framework"

=== SECTION 7 — FOOTER ===

className="py-12 px-6 border-t border-white/10"
Container: max-w-7xl mx-auto

Two column layout (flex flex-col md:flex-row justify-between gap-8):

Left:
- Logo (same as navbar)
- Description: className="text-white/40 text-sm mt-3 max-w-xs"
  "AI-powered developer productivity suite for modern engineering teams."

Right (flex gap-12):
Column "Product":
- Heading: text-white/60 text-xs uppercase tracking-wider mb-4 font-medium
- Links: Features, Pricing, GitHub
  Each: text-white/40 hover:text-white text-sm block mb-2 transition-colors

Column "Links":
- Heading: same style
- Links: Sign In (/sign-in), Get Started (/sign-up), Dashboard (/dashboard)

Bottom bar (border-t border-white/10 mt-12 pt-8 text-center):
className="text-white/30 text-xs"
"© 2026 DevScope AI · Built by Saif ur Rehman · FAST NUCES Islamabad"

=== OUTER WRAPPER ===

The entire page should be wrapped in:
<div className="bg-[#0A0A0A] text-white min-h-screen">
  {all sections}
</div>

Import at top of page.tsx (Server Component — no 'use client'):
Import Link from 'next/link'
Import icons from 'lucide-react': MessageSquare, FileText, GitPullRequest, BarChart2, GitBranch, Zap, Sparkles, CheckCircle2, X, Check

=== VERIFICATION ===
1. npx tsc --noEmit in apps/web — fix ALL errors
2. Log OUT of the app completely
3. Visit http://localhost:3000 — verify the dark landing page loads (NOT a redirect to dashboard)
4. Verify all 7 sections render correctly:
   - Navbar is fixed at top with blur
   - Hero section has the radial gradient background
   - All 4 feature cards in 2x2 grid
   - 3-step how it works section
   - 2 pricing cards with Most Popular badge
   - 4 tech badges
   - Footer with two columns
5. Click "Get Started Free" — verify it goes to /sign-up
6. Click "Sign In" — verify it goes to /sign-in
7. Click "Features" in navbar — verify smooth scroll to features section
8. Resize browser to 375px width — verify mobile layout:
   - Navbar center links hidden
   - Feature cards stack vertically
   - Pricing cards stack vertically
9. Log IN and visit http://localhost:3000 — verify redirect to /dashboard still works
Report all results.
