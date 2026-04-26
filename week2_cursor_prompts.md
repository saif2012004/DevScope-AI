# DevScope AI — Week 2 Cursor Prompts
# Week 2 goal: Polished dashboard shell, repo input form, usage meter, and complete billing UI.
# By end of week: Users can sign up, subscribe, add a repo, and see a real working dashboard.
# Use these IN ORDER. Complete and verify each prompt before starting the next.
# Always have `npm run docker:up` and `npm run dev` running before you start.

---

## CONTEXT (read before every prompt session)
At the end of Week 1 we have:
- Next.js 14 frontend at /apps/web — Clerk auth working, protected /dashboard route
- Express backend at /apps/api — Clerk JWT middleware, Stripe checkout + webhook endpoints, planGate middleware
- PostgreSQL schema via Prisma — User, Repo, ChatSession, Message, UsageLog models
- Redis running via Docker
- GitHub Actions CI passing

Week 2 builds the complete visible product shell. No AI yet — just the full UI that users will interact with every day.

---

## PROMPT 1 — Design System + Layout Shell
### (Run first. This sets the visual foundation everything else builds on.)

```
We are building DevScope AI — a SaaS developer tool. Week 1 is complete: auth, database, Stripe, and CI all work. Now build the complete design system and dashboard layout shell.

## Design tokens
In /apps/web/src/app/globals.css, extend the existing Tailwind/shadcn CSS variables. Add these custom properties inside :root:

--sidebar-width: 240px;
--header-height: 56px;
--content-max-width: 1100px;

Color palette additions (add to :root):
--brand-purple: 250 84% 54%;       /* HSL — used as primary brand color */
--brand-purple-light: 250 84% 96%; /* Light tint for backgrounds */
--brand-purple-dark: 250 84% 38%;  /* Dark shade for hover states */

In /apps/web/tailwind.config.ts, extend the theme:
- Add colors: brand: { DEFAULT: 'hsl(var(--brand-purple))', light: 'hsl(var(--brand-purple-light))', dark: 'hsl(var(--brand-purple-dark))' }
- Add sidebar: { width: 'var(--sidebar-width)' }
- Extend fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] }

Install Inter font: add `import { Inter } from 'next/font/google'` to /apps/web/src/app/layout.tsx and apply it.

## Shared components to create

### /apps/web/src/components/shared/Logo.tsx
- Renders the DevScope AI logo
- A small purple square icon (just a colored <div> with "DS" in white, rounded-md) + "DevScope" text in font-semibold + " AI" in text-brand font-bold
- Accepts size prop: "sm" | "md" (default "md")
- sm: icon 24px, text-sm; md: icon 32px, text-base

### /apps/web/src/components/shared/Spinner.tsx
- A simple animated spinner using Tailwind animate-spin
- Accepts size prop: "sm" | "md" | "lg"
- Uses brand color border

### /apps/web/src/components/shared/EmptyState.tsx
- Accepts: icon (lucide icon component), title: string, description: string, action?: { label: string, onClick: () => void }
- Renders centered content with icon (48px, text-muted-foreground), bold title, muted description, and optional Button
- Used throughout the app for empty lists

### /apps/web/src/components/shared/PageHeader.tsx
- Accepts: title: string, description?: string, action?: React.ReactNode
- Renders a consistent page header: large bold title, muted description below, optional action element on the right
- Has a bottom border separator

### /apps/web/src/components/shared/StatCard.tsx
- Accepts: label: string, value: string | number, icon: lucide icon, trend?: { value: number, label: string }
- Renders a shadcn Card with the icon top-right, large value, label below
- If trend provided: shows green ↑ or red ↓ with value and label

## Dashboard layout — /apps/web/src/app/(dashboard)/layout.tsx
Rebuild this layout completely. It must be a proper sidebar + main layout.

Structure:
```
<div class="flex h-screen overflow-hidden bg-background">
  <Sidebar />                          ← fixed left sidebar
  <div class="flex flex-col flex-1 overflow-hidden">
    <Header />                         ← top header bar
    <main class="flex-1 overflow-y-auto p-6">
      {children}
    </main>
  </div>
</div>
```

### Sidebar component — /apps/web/src/components/layout/Sidebar.tsx
Width: 240px, fixed height, flex column, border-right, bg-background.

Top section:
- Logo component (md size) with padding, clicking goes to /dashboard
- A thin separator

Navigation section (middle, flex-1):
Create a navItems array with these items (each has: href, label, icon from lucide-react):
- /dashboard → Home icon → "Dashboard"
- /dashboard/repos → GitBranch icon → "Repositories"
- /dashboard/chat → MessageSquare icon → "AI Chat"
- /dashboard/docs → FileText icon → "Documentation"
- /dashboard/billing → CreditCard icon → "Billing"

Render each nav item as a Link. Active state: use usePathname() to detect current route. Active style: bg-brand-light text-brand font-medium. Inactive style: text-muted-foreground hover:bg-accent hover:text-foreground.

Bottom section:
- PlanBadge showing the user's current plan (fetch from React Query cache key ['currentUser'])
- User avatar + name from Clerk's useUser()
- Small settings gear icon linking to /dashboard/settings

### Header component — /apps/web/src/components/layout/Header.tsx
Height: 56px, border-bottom, bg-background, flex items-center justify-between, px-6.

Left side:
- Page title — dynamically read from a React context (we'll set it per page)
- Create /apps/web/src/context/PageTitleContext.tsx: a simple context + hook (usePageTitle, useSetPageTitle)

Right side:
- A search button (just a button with Search icon + "Search..." text styled like an input — non-functional for now, placeholder)
- NotificationBell: a Bell icon with a small red dot badge (static, non-functional for now)
- UserButton from Clerk (@clerk/nextjs) — shows user avatar with dropdown for sign out

## Update /apps/web/src/app/(dashboard)/dashboard/page.tsx
Replace the placeholder with a real overview page:

Import and use useSetPageTitle("Dashboard") at the top.

Render:
1. A welcome banner: "Good morning, [firstName]" (use Clerk's useUser() for firstName). Small text below: "Here's what's happening with your repositories."

2. A stats row (4 StatCards side by side, responsive: grid-cols-1 sm:grid-cols-2 lg:grid-cols-4):
   - "Repositories": value=0, icon=GitBranch
   - "AI Messages": value=0, icon=MessageSquare
   - "Files Indexed": value=0, icon=FileCode
   - "This Month": value="Free Plan", icon=Zap

   (All values hardcoded to 0 for now — we'll make them dynamic in Week 3)

3. A "Quick Actions" section with 3 cards in a row:
   - "Add Repository" — GitBranch icon, description "Connect a GitHub repo to get started", button "Add Repo" → links to /dashboard/repos
   - "Start AI Chat" — MessageSquare icon, description "Ask questions about your codebase", button "Open Chat" → links to /dashboard/chat
   - "Generate Docs" — FileText icon, description "Auto-generate documentation", button "Generate" → links to /dashboard/docs

4. A "Recent Activity" section:
   - Shows EmptyState with BookOpen icon, title "No activity yet", description "Add a repository to get started"

## Verification
1. Dashboard layout renders correctly at http://localhost:3000/dashboard
2. Sidebar navigation highlights the active route
3. Logo renders in sidebar
4. Header shows page title and user avatar
5. Dashboard overview page shows stats, quick actions, and empty state
6. No TypeScript errors
7. Layout is responsive — on mobile (<768px) hide the sidebar (display: none for now — mobile nav comes later)
```

---

## PROMPT 2 — Repositories Page + Repo Input Form
### (Run after Prompt 1 verification passes)

```
We are building DevScope AI. The dashboard layout and design system are complete. Now build the Repositories page where users add and manage their GitHub repos.

## Backend — Repo API endpoints
In /apps/api/src/routes/repos.routes.ts, implement these routes (all protected by requireAuth):

GET /api/repos
- Get all repos for the current user (by clerkId from req.auth.userId)
- Query: prisma.repo.findMany({ where: { user: { clerkId } }, orderBy: { createdAt: 'desc' } })
- Return array of repos

POST /api/repos
- Apply planGate("unlimited_repos") middleware before the controller
- Body: { githubUrl: string }
- Validate githubUrl:
  - Must be a valid GitHub URL format: https://github.com/{owner}/{repo}
  - Strip trailing slashes and .git suffix
  - Extract owner and repoName from the URL
  - If invalid format, return 400 { error: "Invalid GitHub URL. Use format: https://github.com/owner/repo" }
- Check for duplicate: if this user already has this githubUrl, return 409 { error: "You have already added this repository" }
- Call GitHub API to verify the repo exists and get metadata:
  - GET https://api.github.com/repos/{owner}/{repoName}
  - Use Authorization: token {GITHUB_TOKEN} header if GITHUB_TOKEN env var is set (optional — works without it but rate-limited)
  - If GitHub returns 404, return 404 { error: "Repository not found or is private. Make sure the URL is correct." }
  - If GitHub returns 403 (rate limit), return 503 { error: "GitHub rate limit reached. Please try again in a minute." }
  - Extract from response: defaultBranch, isPrivate, description
- Create repo in DB with status: PENDING
- Log to UsageLog: action="repo_added"
- Return the created repo object with status 201

DELETE /api/repos/:repoId
- Find repo by id and verify it belongs to the current user (if not, return 404)
- Delete the repo and all related ChatSessions and Messages (use Prisma cascade or manual delete)
- Return 204 No Content

GET /api/repos/:repoId
- Get a single repo by id (verify ownership)
- Return repo object

Add GITHUB_TOKEN= to /apps/api/.env (empty — optional but useful)

## Frontend — Repositories page

Create /apps/web/src/app/(dashboard)/dashboard/repos/page.tsx:

At the top: useSetPageTitle("Repositories")

Fetch repos: useQuery({ queryKey: ['repos'], queryFn: () => api.get('/api/repos').then(r => r.data) })

### Layout
If repos array is empty:
- Show EmptyState with GitBranch icon, title "No repositories yet", description "Add your first GitHub repository to start getting AI-powered insights", action button "Add Repository" that opens the AddRepoModal

If repos array has items:
- Show PageHeader with title "Repositories", description "Manage your connected GitHub repositories", action = <Button onClick={openModal}>Add Repository</Button>
- Show a grid of RepoCard components (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Below the grid: show usage indicator if user is on Free plan (see below)

### RepoCard component — /apps/web/src/components/repos/RepoCard.tsx
Accepts: repo object (id, githubOwner, githubName, githubUrl, status, totalFiles, totalChunks, indexedAt, createdAt)

Renders a shadcn Card with:
- Top row: GitHub icon (use a simple <svg> for the GitHub octocat mark OR just use the Code2 lucide icon) + "{owner} / {repoName}" in font-mono font-medium + a StatusBadge on the right
- Middle: small stats row: "{totalFiles} files" · "{totalChunks} chunks" (show "—" if 0)
- Bottom row: "Added {relative time}" on the left (use a simple relative time formatter) + two icon buttons on the right:
  - Chat icon → links to /dashboard/chat?repoId={id}
  - Trash icon → opens delete confirmation

StatusBadge component — /apps/web/src/components/repos/StatusBadge.tsx:
Accepts status: "PENDING" | "INDEXING" | "INDEXED" | "FAILED"
- PENDING: gray badge "Pending"
- INDEXING: yellow badge with spinning Loader2 icon "Indexing..."
- INDEXED: green badge with CheckCircle icon "Ready"
- FAILED: red badge with XCircle icon "Failed"

### AddRepoModal — /apps/web/src/components/repos/AddRepoModal.tsx
A shadcn Dialog component.

Content:
- Title: "Add Repository"
- Description: "Enter a public GitHub repository URL to index it for AI analysis."
- Input field:
  - Label: "GitHub Repository URL"
  - Placeholder: "https://github.com/facebook/react"
  - Full width
  - Shows validation error inline below if URL format is wrong
- A small info box (bg-muted, rounded, p-3) showing:
  - "✓ Public repositories are supported"
  - "✓ Private repos require a GitHub token (coming soon)"
  - If user is on Free plan: "⚠ Free plan: 1 repository maximum. Upgrade for unlimited."
- Footer buttons: Cancel (closes modal) + "Add Repository" (submits)

Form behavior:
- On submit: call POST /api/repos with { githubUrl }
- Show Spinner inside the button while loading
- On success: close modal, invalidate ['repos'] React Query cache, show a toast "Repository added! Indexing will begin shortly."
- On error: show the error message from the API response inline below the input (don't toast errors — keep them in context)
- Validate URL format client-side before submitting: must match /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/

### Delete confirmation
When trash icon is clicked on RepoCard:
- Show a shadcn AlertDialog with:
  - Title: "Delete Repository"
  - Description: "Are you sure you want to delete {owner}/{repoName}? This will permanently delete all chat history and indexed data for this repository. This action cannot be undone."
  - Cancel button + "Delete" button (destructive variant, red)
- On confirm: call DELETE /api/repos/{repoId}, invalidate ['repos'] cache, show toast "Repository deleted"

### Free plan usage indicator
Create /apps/web/src/components/repos/UsageBanner.tsx:
- Only shown when user.plan === "FREE"
- Shows: "Free Plan: 1 of 1 repository used" with a full progress bar
- A link: "Upgrade to Pro for unlimited repositories →" that goes to /dashboard/billing
- Style: bg-amber-50 border border-amber-200 rounded-lg p-4 (use Tailwind directly — not brand purple)

## Toast setup
Install and configure sonner (better than shadcn's built-in toast for our use case):
- npm install sonner in apps/web
- Add <Toaster /> to /apps/web/src/app/layout.tsx (inside the body, outside ClerkProvider is fine)
- Export a toast utility from /apps/web/src/lib/toast.ts that re-exports from sonner

## API hooks
Create /apps/web/src/hooks/useRepos.ts:
- useRepos(): React Query hook for fetching repos list
- useAddRepo(): React Query mutation for adding a repo (handles cache invalidation)
- useDeleteRepo(): React Query mutation for deleting a repo

## Verification
1. /dashboard/repos renders empty state when no repos
2. Clicking "Add Repository" opens the modal
3. Entering an invalid URL shows inline validation error
4. Entering a valid GitHub URL (e.g. https://github.com/facebook/react) calls the API and creates the repo
5. The repo appears in the grid with "Pending" status badge
6. Clicking trash opens the confirmation dialog
7. Confirming delete removes the repo from the list
8. On Free plan, UsageBanner appears after adding 1 repo
9. No TypeScript errors
```

---

## PROMPT 3 — Billing Page + Upgrade Flow (Complete UI)
### (Run after Prompt 2 verification passes)

```
We are building DevScope AI. Repos page is complete. Now build the full polished billing page and upgrade flow. The Stripe backend endpoints already exist from Week 1. This prompt is frontend-only.

## Current state
- POST /api/billing/create-checkout-session exists and returns { url }
- POST /api/billing/create-portal-session exists and returns { url }
- GET /api/billing/subscription-status exists and returns { plan, subscriptionStatus, stripeSubscriptionId }
- User plan and status are stored in the DB and synced via Clerk webhook

## Frontend — Billing page at /apps/web/src/app/(dashboard)/dashboard/billing/page.tsx

Replace the placeholder billing page with a complete, polished version.

At the top: useSetPageTitle("Billing & Plan")

### Data fetching
Create /apps/web/src/hooks/useBilling.ts:
- useBillingStatus(): fetches GET /api/billing/subscription-status, caches under ['billing']
- useCreateCheckoutSession(): mutation that calls POST /api/billing/create-checkout-session and returns the URL
- useCreatePortalSession(): mutation that calls POST /api/billing/create-portal-session and returns the URL

### Page layout (3 sections stacked vertically):

SECTION 1 — Current Plan Banner
A prominent card at the top showing the user's current plan.

If FREE plan:
- Light purple/amber gradient banner (use Tailwind classes: bg-gradient-to-r from-purple-50 to-amber-50)
- Left side: Crown icon + "Free Plan" in large text + "You're on the free plan. Upgrade to unlock everything."
- Right side: "Upgrade to Pro →" button (brand color, large)

If PRO plan:
- Solid brand-purple-light banner
- Left side: Sparkles icon + "Pro Plan" in large text + "You have access to all features."
- Right side: "Manage Subscription" button (outline variant) + status badge showing "Active" in green

SECTION 2 — Plan Comparison Cards
Two cards side by side (grid-cols-1 md:grid-cols-2, gap-6):

FREE card:
- Header: "Free" in large text + "/month"
- Subtext: "Get started for free"
- Feature list (use CheckCircle icons in gray):
  - 1 GitHub repository
  - 50 AI messages per month
  - Codebase Q&A
  - Basic documentation
- Bottom: Current plan badge (if on free) OR nothing

PRO card (highlighted with brand purple border, border-2):
- "Most Popular" badge pinned top-right (bg-brand text-white, text-xs, rounded-full, absolute positioned)
- Header: "$12" in large text + "/month"  
- Subtext: "Everything you need"
- Feature list (use CheckCircle icons in BRAND PURPLE):
  - Unlimited repositories
  - Unlimited AI messages
  - Codebase Q&A
  - Auto documentation generation
  - PR review bot
  - Complexity scorer
  - Priority support
- Bottom: "Upgrade to Pro" button (full width, brand color) OR "Current Plan" badge if already Pro

SECTION 3 — Billing History (only shown if user is PRO)
A simple card with:
- Header: "Billing History"
- Body: A table with columns: Date, Amount, Status, Invoice
- For now: a single placeholder row: "—", "$12.00", "Paid", "View Invoice" link
- Below table: small text "Full billing history is available in the Stripe Customer Portal." with "Open Portal →" link

### Upgrade flow
"Upgrade to Pro" button behavior:
1. On click: set button to loading state (disable + spinner)
2. Call useCreateCheckoutSession mutation
3. On success: window.location.href = data.url (redirect to Stripe Checkout)
4. On error: show toast error "Something went wrong. Please try again."

### Post-upgrade success handling
Read URL params on /dashboard/billing?upgraded=true:
- Show a shadcn Alert at top of page: variant="default" with a CheckCircle icon, title "You're now on Pro!", description "Your account has been upgraded. All features are now unlocked."
- Remove the ?upgraded=true param from URL after showing (use router.replace)

### Manage subscription
"Manage Subscription" button:
1. Loading state while calling API
2. Call useCreatePortalSession mutation
3. Redirect to portal URL

## Update dashboard sidebar
In the Sidebar component, add a clickable upgrade prompt at the very bottom (only shown for FREE users):
- A small card with bg-brand-light, purple border
- Zap icon + "Upgrade to Pro" text in small, bold
- "$12/month — unlock everything" subtitle in xs text  
- Clicking it navigates to /dashboard/billing
- Position: above the user avatar section, before the bottom border

## Update PlanBadge component
Make PlanBadge more polished:
- FREE: gray pill, "Free" text, no icon
- PRO: gradient purple-to-amber pill, small Crown icon, "Pro" text
- Used in: sidebar user section + billing page

## Verification
1. /dashboard/billing renders the current plan banner correctly
2. Plan comparison cards render side by side
3. "Upgrade to Pro" button calls the checkout session endpoint and redirects (requires real Stripe keys — can test the API call fires with a network request in DevTools)
4. Sidebar shows upgrade prompt for Free users
5. PlanBadge renders correctly in both states
6. No TypeScript errors
```

---

## PROMPT 4 — Usage Meter + Settings Page + Nav Polish
### (Run after Prompt 3 verification passes)

```
We are building DevScope AI. Billing, repos, and dashboard pages are complete. Now add: usage tracking display, settings page, and polish the navigation.

## Backend — Usage endpoint

In /apps/api/src/routes/auth.routes.ts, add a new route:

GET /api/auth/usage
- Protected by requireAuth
- Get current user from DB
- Query UsageLog for this month's usage:
  - Start of month: first day of current month at 00:00:00 UTC
  - messagesThisMonth: count of UsageLog rows where userId matches, action="chat_message", createdAt >= start of month
  - repoCount: count of repos for this user
- Return:
{
  plan: user.plan,
  messagesThisMonth: number,
  messagesLimit: 50 (if FREE) or null (if PRO — unlimited),
  repoCount: number,
  repoLimit: 1 (if FREE) or null (if PRO),
  memberSince: user.createdAt
}

## Frontend — Usage hook + component

Create /apps/web/src/hooks/useUsage.ts:
- useUsage(): React Query hook fetching GET /api/auth/usage, caches under ['usage'], refetches every 60 seconds (staleTime: 60000)

Create /apps/web/src/components/shared/UsageMeter.tsx:
Accepts: used: number, limit: number | null, label: string
- If limit is null (Pro plan): show "Unlimited" in green text — no progress bar
- If limit is a number:
  - Show a progress bar (use shadcn Progress component)
  - Percentage: Math.min((used / limit) * 100, 100)
  - Color: green if <70%, yellow if 70-90%, red if >90%
  - Below bar: "{used} / {limit} {label}"
  - If at 100%: show small alert "Limit reached. Upgrade to Pro to continue."

## Update the Dashboard overview page stats
In /apps/web/src/app/(dashboard)/dashboard/page.tsx, make the StatCards dynamic:

Use useUsage() hook. Update the 4 StatCards with real data:
- "Repositories": value = usage.repoCount
- "AI Messages": value = usage.messagesThisMonth
- "Files Indexed": still 0 (will be real in Week 3)
- "Plan": value = usage.plan === 'PRO' ? 'Pro Plan' : 'Free Plan', icon changes to Crown for Pro

Add a "Usage" section below Quick Actions (only for FREE plan users):
- Section heading "This Month's Usage"
- Two UsageMeters side by side:
  - Messages: used=usage.messagesThisMonth, limit=50, label="messages"
  - Repositories: used=usage.repoCount, limit=1, label="repositories"
- Below: "Upgrade to Pro for unlimited usage" link to /dashboard/billing

## Settings page
Create /apps/web/src/app/(dashboard)/dashboard/settings/page.tsx:

useSetPageTitle("Settings")

Render three sections as shadcn Cards:

SECTION 1 — Profile
- Heading: "Profile"
- Description: "Your account information is managed by Clerk."
- Show: avatar (use Clerk's user.imageUrl in a rounded img), full name, email address
- A button "Edit Profile →" that calls Clerk's openUserProfile() (from useClerk() hook) — this opens Clerk's built-in profile editor modal

SECTION 2 — Preferences (non-functional for now but UI complete)
Title: "Preferences"
Two toggle rows:
- "Email notifications" — shadcn Switch component, default on
- "Weekly digest" — shadcn Switch component, default off
Below: small muted text "Notification preferences will be saved to your account."
The switches should change state locally but show a toast "Preferences saved" — no API call yet.

SECTION 3 — Danger Zone
Title: "Danger Zone"
Description: "Irreversible actions. Be careful."
Red-bordered card (border-destructive):
- "Delete Account" row: description "Permanently delete your account and all data" + a red "Delete Account" button
- On click: open a shadcn AlertDialog:
  - Title: "Are you absolutely sure?"
  - Description: "This will permanently delete your account, all repositories, all chat history, and cancel your subscription. This action CANNOT be undone."
  - Input field: "Type DELETE to confirm" — the confirm button stays disabled until the user types exactly "DELETE"
  - On confirm: show toast "Account deletion coming soon — please contact support." (actual deletion not implemented yet)

## Navigation updates

### Add Settings to sidebar nav
Add to the navItems array in Sidebar.tsx:
- /dashboard/settings → Settings icon → "Settings"
Position: just above the bottom user section, after Billing.

### Keyboard shortcut hint in header search button
Update the search placeholder button in Header.tsx:
- Show "Search..." on the left and "⌘K" badge on the right (a small rounded bg-muted px-1.5 text-xs)
- Non-functional still but looks polished

### Active route in sidebar — breadcrumb in header
In Header.tsx, update the page title display:
- Show the page title from PageTitleContext
- Add a subtle breadcrumb below it: "DevScope AI / {pageTitle}" in text-xs text-muted-foreground

### Mobile sidebar (basic version)
In the dashboard layout, add basic mobile support:
- On mobile (<768px): sidebar is hidden by default
- Add a Menu icon button to the top-left of the Header
- Clicking it toggles a state variable that shows/hides the sidebar as an overlay (fixed position, z-50, with a semi-transparent backdrop)
- Clicking the backdrop or any nav link closes the sidebar
- Use Tailwind's md:flex hidden / md:hidden flex classes appropriately

## Verification
1. /dashboard now shows real repo count and message count from the API
2. Usage meters render correctly on the dashboard for Free plan users
3. /dashboard/settings renders all 3 sections
4. Edit Profile button opens Clerk's profile editor
5. "Delete Account" button shows confirmation dialog with typed confirmation
6. Settings appears in sidebar navigation
7. Mobile: hamburger icon appears on small screens, sidebar toggles on click
8. No TypeScript errors
```

---

## PROMPT 5 — Polish, Error Handling, Loading States + Week 2 Verification
### (Run last — this hardens everything built in Week 2)

```
We are building DevScope AI. All Week 2 features are built: dashboard, repos page, billing page, settings, and usage meters. This final prompt adds polish, global error handling, loading states, and verifies the complete Week 2 deliverable.

## Global error boundary
Create /apps/web/src/components/shared/ErrorBoundary.tsx:
A React class component (required for error boundaries):
- Catches render errors in the component tree
- Shows a fallback UI: centered card with AlertTriangle icon, "Something went wrong" title, the error message in a code block, and a "Reload page" button that calls window.location.reload()
- Wrap the main content area in /apps/web/src/app/(dashboard)/layout.tsx with this ErrorBoundary

## Global 404 page
Create /apps/web/src/app/not-found.tsx:
- Shows: large "404" number in text-brand, "Page not found" heading, "The page you're looking for doesn't exist." description
- A "← Back to Dashboard" button linking to /dashboard
- Centered on the full page

## Global loading states

### Page-level loading
Create /apps/web/src/app/(dashboard)/loading.tsx:
- A full-page centered Spinner (lg size) with "Loading..." text below
- This is Next.js's built-in loading UI — it shows while navigating between dashboard pages

### Skeleton components for repos page
Create /apps/web/src/components/repos/RepoCardSkeleton.tsx:
- A shadcn Skeleton-based placeholder that matches RepoCard dimensions
- Use shimmer animation from shadcn

In repos page: while isLoading is true, show a grid of 3 RepoCardSkeleton components instead of the empty state or real cards.

### API error handling in axios
Update /apps/web/src/lib/api.ts:
Add a response interceptor that:
- If response.status === 401: clear React Query cache, redirect to /sign-in
- If response.status === 403 and response.data.upgradeRequired === true: show a toast with an "Upgrade" action button that navigates to /dashboard/billing
- If response.status >= 500: show a generic toast "Server error. Please try again."
- For all other errors: re-throw the error so individual components can handle them

## Backend error handling polish

In /apps/api/src/middleware/errorHandler.ts, ensure it:
- Catches Prisma errors and returns appropriate HTTP codes:
  - P2002 (unique constraint): 409 Conflict
  - P2025 (record not found): 404 Not Found
- Catches validation errors and returns 400
- In production (NODE_ENV=production): never expose stack traces in responses
- Always returns JSON: { error: string, code?: string }
- Logs all 5xx errors with console.error

## React Query global config
In /apps/web/src/providers/QueryProvider.tsx, update QueryClient config:
- defaultOptions.queries.staleTime: 30000 (30 seconds)
- defaultOptions.queries.retry: 1 (retry once on failure, not 3 times)
- defaultOptions.queries.refetchOnWindowFocus: false (prevent annoying refetches)
- defaultOptions.mutations.onError: global mutation error handler that logs to console

## Empty states audit
Ensure every page has proper empty states. Verify:
- /dashboard/repos: EmptyState with "Add Repository" action ✓ (from Prompt 2)
- /dashboard/chat: Create /apps/web/src/app/(dashboard)/dashboard/chat/page.tsx with useSetPageTitle("AI Chat") and EmptyState: MessageSquare icon, "Select a repository to start chatting", description "Go to Repositories and add a GitHub repo, then return here to ask questions about your code.", action button "Go to Repositories"
- /dashboard/docs: Create /apps/web/src/app/(dashboard)/dashboard/docs/page.tsx with useSetPageTitle("Documentation") and EmptyState: FileText icon, "No documentation generated yet", description "Add and index a repository, then generate documentation from it.", action "Add Repository"

## Final visual polish

### Consistent spacing
Audit all pages and ensure consistent spacing:
- All page content containers: max-w-[var(--content-max-width)] mx-auto
- All sections separated by: space-y-6 or space-y-8
- All cards use: p-6

### Transition animations
Add subtle transitions to interactive elements:
- All sidebar nav links: transition-colors duration-150
- All buttons: transition-all duration-150
- RepoCard: hover:shadow-md transition-shadow duration-200

### Favicon and metadata
In /apps/web/src/app/layout.tsx, update the metadata export:
```typescript
export const metadata: Metadata = {
  title: {
    default: 'DevScope AI',
    template: '%s | DevScope AI',
  },
  description: 'AI-powered developer productivity suite. Understand any codebase instantly.',
  keywords: ['AI', 'developer tools', 'code analysis', 'GitHub', 'documentation'],
}
```

Add a simple favicon: create /apps/web/public/favicon.svg with a simple purple square containing "DS" text.

In each page, export metadata or use generateMetadata. Example for repos page:
```typescript
export const metadata: Metadata = { title: 'Repositories' }
```
(This makes browser tabs show "Repositories | DevScope AI")

## Complete Week 2 verification checklist

Run through this entire flow manually and verify each step:

AUTH FLOW:
[ ] Visit http://localhost:3000 → redirected to /sign-in
[ ] Sign in with Clerk → redirected to /dashboard
[ ] User is created/synced in PostgreSQL (check with Prisma Studio)
[ ] Sidebar shows correct user name and avatar
[ ] Free plan badge shows in sidebar

DASHBOARD:
[ ] Overview page shows welcome message with first name
[ ] Stats show real data (all 0s initially, which is correct)
[ ] Quick action cards render
[ ] Page title in header matches current page

REPOSITORIES:
[ ] /dashboard/repos shows empty state initially
[ ] "Add Repository" button opens modal
[ ] Invalid URL shows inline error (don't submit)
[ ] Valid URL (e.g. https://github.com/facebook/react) submits and creates repo
[ ] Repo appears in grid with "Pending" status
[ ] Deleting repo works with confirmation dialog
[ ] Toast notifications appear for success/error actions

BILLING:
[ ] /dashboard/billing shows correct plan (Free)
[ ] Plan comparison cards render
[ ] Upgrade button triggers API call (check network tab — it should hit POST /api/billing/create-checkout-session)
[ ] With real Stripe keys: redirects to Stripe Checkout
[ ] Sidebar shows upgrade prompt for Free users

SETTINGS:
[ ] /dashboard/settings shows all 3 sections
[ ] Edit Profile opens Clerk modal
[ ] Delete Account confirmation requires typing "DELETE"

NAVIGATION:
[ ] All sidebar links work and show active state
[ ] Mobile: hamburger shows on small screens
[ ] 404 page shows for invalid routes

ERROR HANDLING:
[ ] Disconnecting from internet and refreshing shows graceful error
[ ] Invalid API responses show toast notifications

PERFORMANCE:
[ ] No TypeScript errors: run `npx tsc --noEmit` in both apps
[ ] No console errors in browser
[ ] CI passes: push to GitHub and verify all 3 CI jobs pass

DONE — Week 2 complete. Commit everything with message:
"feat: complete Week 2 dashboard shell, repos page, billing UI, settings, and polish"

You are now ready for Week 3: Repo Ingestion + RAG Pipeline.
```

---

## HOW TO USE THESE PROMPTS

Same rules as Week 1:
1. Always have `npm run docker:up` running before you start
2. Paste one prompt at a time — wait for completion before the next
3. Run the verification steps yourself after each prompt
4. Fix errors with: "Fix this error: [paste error]. Don't change anything else."
5. Commit to Git after each prompt passes verification

## BEFORE STARTING WEEK 2 — Set up real API keys
Week 2 needs real keys to work end-to-end. Do this first:

1. **Clerk dashboard** (clerk.com):
   - Create a new application called "DevScope AI"
   - Copy Publishable Key → /apps/web/.env.local NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
   - Copy Secret Key → /apps/api/.env CLERK_SECRET_KEY
   - In Clerk dashboard: Webhooks → Add endpoint → URL: http://localhost:4000/api/webhooks/clerk (or use ngrok for local testing)

2. **Stripe dashboard** (stripe.com):
   - Create account, go to test mode
   - Copy Publishable Key → /apps/web/.env.local NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
   - Copy Secret Key → /apps/api/.env STRIPE_SECRET_KEY
   - Products → Create Product "DevScope Pro" → Add price $12/month → copy Price ID → /apps/api/.env STRIPE_PRO_PRICE_ID
   - Stripe CLI: `stripe listen --forward-to localhost:4000/api/webhooks/stripe` → copy webhook secret → STRIPE_WEBHOOK_SECRET

3. **Test Stripe locally**:
   - Use card number 4242 4242 4242 4242, any future expiry, any CVC

## WEEK 2 DELIVERABLE
By end of Week 2 you will have:
- A polished, professional dashboard with real navigation
- Users can sign up, log in, and see their dashboard
- Users can add a GitHub repo (status shows as Pending — indexing comes Week 3)
- Users can upgrade to Pro via Stripe Checkout
- Users can manage account settings
- Mobile-responsive layout
- All error states and loading states handled
- CI passing on GitHub
```
