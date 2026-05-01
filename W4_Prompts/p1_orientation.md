We are starting Week 4 of DevScope AI. This is a fresh Claude Code session so you need to fully understand the existing codebase before writing anything.

Read these files in this exact order:

BACKEND /apps/api/src/:
1. index.ts
2. routes/index.ts
3. routes/auth.routes.ts
4. routes/repos.routes.ts
5. routes/chat.routes.ts
6. middleware/requireAuth.ts
7. middleware/planGate.ts
8. middleware/errorHandler.ts
9. services/github.service.ts
10. services/chunker.service.ts
11. services/embedder.service.ts
12. services/rag.service.ts
13. services/vectorStore.service.ts
14. workers/ingestion.worker.ts
15. queues/ingestion.queue.ts
16. lib/prisma.ts
17. lib/stripe.ts
18. prisma/schema.prisma

FRONTEND /apps/web/src/:
19. app/layout.tsx
20. app/page.tsx
21. app/(dashboard)/layout.tsx
22. app/(dashboard)/dashboard/page.tsx
23. app/(dashboard)/dashboard/chat/page.tsx
24. app/(dashboard)/dashboard/repos/page.tsx
25. app/(dashboard)/dashboard/billing/page.tsx
26. app/(dashboard)/dashboard/settings/page.tsx
27. app/(dashboard)/dashboard/docs/page.tsx
28. components/layout/Sidebar.tsx
29. components/layout/Header.tsx
30. components/chat/ (all files)
31. components/repos/ (all files)
32. components/shared/ (all files)
33. hooks/useChat.ts
34. hooks/useRepos.ts
35. hooks/useBilling.ts
36. hooks/useUsage.ts
37. lib/api.ts
38. lib/toast.ts

ALSO READ:
39. apps/api/.env (confirm which keys are configured)
40. apps/api/package.json (installed packages)
41. apps/web/package.json (installed packages)
42. root package.json (monorepo scripts)

After reading EVERYTHING, give me:
1. Complete list of all backend routes (method + path)
2. Complete list of all frontend pages (paths)
3. All Prisma models and their key fields
4. Which AI providers are configured: exact env var names and model names for embeddings and generation
5. What packages are already installed in both apps
6. Any TypeScript errors or broken imports you notice while reading
7. Current state of dotenv fix — confirm CLERK_SECRET_KEY loads correctly

Do NOT write any code yet. Read everything first and give me a complete accurate report.
