Run the complete Week 4 end-to-end verification. Do every step yourself and report results.

=== STEP 1 — TypeScript ===
Run: cd apps/api && npx tsc --noEmit
Run: cd apps/web && npx tsc --noEmit
Fix every single error found in both apps.
Do not proceed until both report 0 errors.
Report: "apps/api: 0 errors. apps/web: 0 errors."

=== STEP 2 — Database ===
Run npx prisma studio (from wherever schema.prisma lives)
Confirm these tables ALL exist:
From Week 1-3: User, Repo, ChatSession, Message, UsageLog
From Week 4: GeneratedDoc, PrReview, ComplexityScore
Report: list all 8 tables confirmed.

=== STEP 3 — Backend health check ===
Run: curl http://localhost:4000/api/health
Expected: { "status": "ok", "timestamp": "..." }
Run: curl http://localhost:4000/admin/queues (should return HTML)
Report results of both.

=== STEP 4 — All routes exist ===
Look at /apps/api/src/routes/index.ts
Confirm these route groups are all registered:
- /api/auth (auth.routes.ts)
- /api/repos (repos.routes.ts)
- /api/chat (chat.routes.ts)
- /api/docs (docs.routes.ts)
- /api/pr-review (prReview.routes.ts)
- /api/complexity (complexity.routes.ts)
- /api/billing (billing.routes.ts)
- /api/webhooks/stripe
Report: list all registered route groups.

=== STEP 5 — All pages exist ===
Check /apps/web/src/app/(dashboard)/dashboard/ directory
Confirm these page.tsx files all exist:
- dashboard/page.tsx (overview)
- dashboard/repos/page.tsx
- dashboard/chat/page.tsx
- dashboard/pr-review/page.tsx
- dashboard/complexity/page.tsx
- dashboard/docs/page.tsx
- dashboard/billing/page.tsx
- dashboard/settings/page.tsx
Also confirm: apps/web/src/app/page.tsx (landing page)
Report: list all pages confirmed.

=== STEP 6 — Sidebar navigation ===
Open /apps/web/src/components/layout/Sidebar.tsx
Confirm navItems has exactly 8 entries in the correct order:
Dashboard, Repositories, AI Chat, PR Review, Complexity, Documentation, Billing, Settings
Report: confirmed or list what is missing/wrong.

=== STEP 7 — Feature test: Documentation Generator ===
Make sure the dev server is running (npm run dev from root).
Navigate to http://localhost:3000/dashboard/docs in the browser.
- Select an indexed repo
- Click "Generate Documentation"
- Wait for completion (up to 2 minutes)
- Verify: all 6 sections generated, full markdown rendered, table of contents visible
- Click "Download .md" — verify file downloads
If it worked: report "Doc generator: PASS"
If it failed: report the exact error message from the browser console or API terminal.

=== STEP 8 — Feature test: PR Review Bot ===
Navigate to http://localhost:3000/dashboard/pr-review
- Select an indexed repo
- Use this PR URL: https://github.com/expressjs/express/pull/5727
  (If that doesn't work, find any open PR on github.com and use that URL)
- Click "Analyze PR"
- Wait up to 30 seconds
- Verify: verdict badge appears, issues grouped by severity, positives listed
If it worked: report "PR Review: PASS, verdict was [X], found [N] issues"
If it failed: report exact error.

=== STEP 9 — Feature test: Complexity Scorer ===
Navigate to http://localhost:3000/dashboard/complexity
- Select an indexed repo
- Click the example chip "Add rate limiting to all API endpoints"
- Click "Estimate Complexity"
- Wait up to 20 seconds
- Verify: effort score shows with circular arc, affected files table has real paths, implementation plan has steps
If worked: report "Complexity scorer: PASS, score was [N]/10"
If failed: report exact error.

=== STEP 10 — Landing page ===
Log out of the app completely.
Visit http://localhost:3000
- Verify: dark landing page loads (not dashboard redirect)
- Verify: all sections visible (navbar, hero, features, how it works, pricing, tech stack, footer)
- Click "Get Started Free" — verify it goes to /sign-up
Log back in — verify redirect to /dashboard still works.
Report: "Landing page: PASS" or describe issue.

=== STEP 11 — Dashboard stats ===
Navigate to /dashboard
- Verify StatCards show real numbers
- Verify Recent Activity section shows actual actions (if any exist in DB)
Report: what numbers you see in the stat cards.

=== STEP 12 — Browser tab titles ===
Navigate through these pages and check the browser tab title for each:
- /dashboard → should show "Dashboard | DevScope AI"
- /dashboard/chat → "AI Chat | DevScope AI"
- /dashboard/pr-review → "PR Review | DevScope AI"
- /dashboard/complexity → "Complexity | DevScope AI"
- /dashboard/docs → "Documentation | DevScope AI"
Report: all titles correct or list which ones are wrong.

=== STEP 13 — Mobile responsiveness ===
In browser DevTools, set viewport to 375px width.
Check these pages:
- / (landing page) — navbar center links hidden, cards stacked vertically
- /dashboard — sidebar hidden, content full width
- /dashboard/chat — layout adjusts for narrow screen
Report any layout issues found and fix them.

=== STEP 14 — Git status and commit ===
Run: git status
Review all new and modified files.
Run: git add .
Run: git commit -m "feat: complete Week 4 — doc generator, PR review bot, complexity scorer, landing page, dashboard stats, polish"
Run: git log --oneline -6
Report: the 6 most recent commit messages.

=== FINAL SUMMARY ===
After all steps, give me this exact report:

WEEK 4 COMPLETE REPORT:
- TypeScript: apps/api [X errors], apps/web [X errors]
- Database tables: [list all 8]
- Backend routes: [list all route groups]
- Frontend pages: [list all 9 pages]
- Doc Generator: [PASS/FAIL + details]
- PR Review Bot: [PASS/FAIL + details]
- Complexity Scorer: [PASS/FAIL + details]
- Landing Page: [PASS/FAIL]
- Dashboard Stats: [real data showing / not showing]
- Browser Titles: [correct / issues found]
- Mobile Layout: [responsive / issues found]
- Git commit: [commit hash]
- Any known issues or incomplete items: [list]
