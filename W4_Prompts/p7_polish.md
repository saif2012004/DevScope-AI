Wire up real dashboard stats and add final polish across the entire app.

=== BACKEND — Update usage endpoint ===

Open /apps/api/src/routes/auth.routes.ts and find the GET /api/auth/usage endpoint.
Update it to return this expanded response:

Get from DB for the current user:
- messagesThisMonth: count of UsageLog rows where userId matches AND action='chat_message' AND createdAt >= first day of current month (UTC)
- repoCount: count of repos where userId matches
- totalChunks: sum of totalChunks field across all repos where userId matches AND status='INDEXED'
- totalFiles: sum of totalFiles field across all repos where userId matches AND status='INDEXED'
- docsGenerated: count of GeneratedDoc rows where userId matches
- prReviewsCount: count of PrReview rows where userId matches
- complexityScoresCount: count of ComplexityScore rows where userId matches

Return this JSON shape:
{
  plan: user.plan,
  messagesThisMonth,
  messagesLimit: user.plan === 'FREE' ? 50 : null,
  repoCount,
  repoLimit: user.plan === 'FREE' ? 1 : null,
  totalChunks,
  totalFiles,
  docsGenerated,
  prReviewsCount,
  complexityScoresCount,
  memberSince: user.createdAt,
}

Also add a new endpoint GET /api/auth/activity:
- Returns last 10 UsageLog entries for the current user ordered by createdAt desc
- Include repo info: join with Repo to get githubOwner and githubName
- Return: array of { id, action, repoId, repoOwner, repoName, tokensUsed, createdAt }
- If repoId is null (for some logs): repoOwner and repoName should be null too

=== FRONTEND — Dashboard overview page ===

Open /apps/web/src/app/(dashboard)/dashboard/page.tsx

Update to use real data from useUsage() hook.

The 4 StatCards should show real values:
1. "Repositories": value = usage?.repoCount ?? 0, icon = GitBranch
2. "Files Indexed": value = (usage?.totalFiles ?? 0).toLocaleString(), icon = FileCode (import from lucide-react)
3. "AI Messages": value = usage?.plan === 'PRO' ? usage?.messagesThisMonth ?? 0 : `${usage?.messagesThisMonth ?? 0}/${usage?.messagesLimit ?? 50}`, icon = MessageSquare
4. "Features Used": value = (usage?.docsGenerated ?? 0) + (usage?.prReviewsCount ?? 0) + (usage?.complexityScoresCount ?? 0), icon = Zap

For FREE plan users only — add a usage section below the Quick Actions:
Show two UsageMeter components (already built in Week 2):
- Messages: used=messagesThisMonth, limit=50, label="messages this month"
- Repos: used=repoCount, limit=1, label="repositories"
Below: "Upgrade to Pro for unlimited usage →" link to /dashboard/billing

Add a "Recent Activity" section below the usage meters:
Create a custom hook or inline fetch for GET /api/auth/activity
Show as a list (max 5 items):
Each item: flex items-center gap-3 py-2 border-b last:border-0
- Icon based on action:
  chat_message → MessageSquare (text-purple-500)
  doc_generate → FileText (text-blue-500)
  pr_review → GitPullRequest (text-green-500)
  complexity_score → BarChart2 (text-orange-500)
- Content:
  Action label: "AI Chat" | "Doc Generated" | "PR Reviewed" | "Complexity Scored"
  If repoOwner and repoName: small muted text "{owner}/{name}" below
- Relative time right-aligned: text-xs text-muted-foreground

If no activity yet: show EmptyState with Clock icon, "No activity yet", "Your recent actions will appear here"

=== FRONTEND — Polish items ===

ITEM 1 — Page transitions:
Open /apps/web/src/app/(dashboard)/layout.tsx
Wrap the {children} in:
<div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
  {children}
</div>

In /apps/web/tailwind.config.ts, verify these are in the theme.extend section.
If not present, add:
animation: {
  'in': 'in 0.2s ease-out',
}
keyframes: {
  in: {
    from: { opacity: '0', transform: 'translateY(4px)' },
    to: { opacity: '1', transform: 'translateY(0)' },
  },
}

Actually, Tailwind v3 already has animate-in via the tailwindcss-animate plugin. 
Check if tailwindcss-animate is installed. If not: npm install tailwindcss-animate in apps/web
Add to tailwind.config.ts plugins array: require('tailwindcss-animate')

ITEM 2 — Repo ready notification:
Open /apps/web/src/components/repos/RepoCard.tsx
Find where status changes from INDEXING to INDEXED (the polling useEffect)
When status becomes INDEXED, show a toast:
toast.success(`${repo.githubOwner}/${repo.githubName} is ready!`, {
  description: 'Your repository has been indexed and is ready for AI chat.',
  action: {
    label: 'Open Chat',
    onClick: () => router.push(`/dashboard/chat?repoId=${repo.id}`),
  },
  duration: 8000,
})
Import useRouter from next/navigation if not already imported.

ITEM 3 — Global keyboard shortcut:
Open /apps/web/src/app/(dashboard)/dashboard/chat/page.tsx
Add a useEffect that listens for Ctrl+K or Cmd+K and focuses the chat textarea:
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      inputRef.current?.focus()
    }
  }
  document.addEventListener('keydown', handler)
  return () => document.removeEventListener('keydown', handler)
}, [])
Create the inputRef and attach it to the Textarea element in ChatInput component.
Pass the ref down from the page through ChatMain to ChatInput.

ITEM 4 — Metadata for all pages:
In each dashboard page file, export a metadata object for the browser tab title.
Add this export to each page:
export const metadata = { title: 'PAGE_NAME' }

Pages to update:
- /dashboard/page.tsx → title: 'Dashboard'
- /dashboard/repos/page.tsx → title: 'Repositories'
- /dashboard/chat/page.tsx → title: 'AI Chat'
- /dashboard/pr-review/page.tsx → title: 'PR Review'
- /dashboard/complexity/page.tsx → title: 'Complexity'
- /dashboard/docs/page.tsx → title: 'Documentation'
- /dashboard/billing/page.tsx → title: 'Billing'
- /dashboard/settings/page.tsx → title: 'Settings'

The template in root layout.tsx should already be '%s | DevScope AI' from Week 2.
Verify this is set — if not, update root layout metadata to:
export const metadata = {
  title: { default: 'DevScope AI', template: '%s | DevScope AI' },
  description: 'AI-powered developer productivity suite.',
}

ITEM 5 — Stripe graceful fallback:
Open /apps/api/src/routes/billing.routes.ts
At the top of every route handler that uses stripe, add this guard:
if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('placeholder')) {
  return res.status(503).json({ 
    error: 'Billing not configured', 
    message: 'Payment processing is not set up yet.' 
  })
}

In /apps/web/src/app/(dashboard)/dashboard/billing/page.tsx:
If the billing status API returns 503, show a neutral info card instead of an error:
bg-muted rounded-lg p-6 text-center
Icon: CreditCard (48px, text-muted-foreground)
Title: "Billing Coming Soon"
Description: "Payment processing is being configured. Check back soon."
Do not show the upgrade buttons or pricing cards in this state.

=== VERIFICATION ===
1. npx tsc --noEmit in both apps — fix ALL errors
2. Restart both servers
3. Navigate to /dashboard
4. Verify StatCards show real numbers from the DB (not zeros, assuming you've used the app)
5. Verify Recent Activity list shows your last actions with correct icons and repo names
6. Navigate to /dashboard/chat — press Ctrl+K (or Cmd+K on Mac) — verify it focuses the chat input
7. Add a new test repo — verify the "ready" toast appears when indexing completes with "Open Chat" action button
8. Check browser tab titles: each dashboard page should show "Page Name | DevScope AI"
9. Navigate between pages — verify the subtle fade+slide transition
10. Go to /dashboard/billing — verify it doesn't crash even with placeholder Stripe keys
Report all results.
