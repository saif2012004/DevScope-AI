Good. Now run these 3 setup steps before we build any feature. Do all 3 completely before reporting back.

SETUP STEP 1 — Add 3 new Prisma models to the schema.

Find schema.prisma (check /packages/db/prisma/ or /apps/api/prisma/) and add these models:

model GeneratedDoc {
  id          String   @id @default(cuid())
  repoId      String   @unique
  repo        Repo     @relation(fields: [repoId], references: [id], onDelete: Cascade)
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  content     String   @db.Text
  tokensUsed  Int      @default(0)
  generatedAt DateTime @default(now())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model PrReview {
  id          String   @id @default(cuid())
  repoId      String
  repo        Repo     @relation(fields: [repoId], references: [id], onDelete: Cascade)
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  prNumber    Int
  prTitle     String
  prUrl       String
  verdict     String
  summary     String   @db.Text
  fullReview  String   @db.Text
  issueCount  Int      @default(0)
  tokensUsed  Int      @default(0)
  createdAt   DateTime @default(now())

  @@index([repoId])
  @@index([userId])
}

model ComplexityScore {
  id                 String   @id @default(cuid())
  repoId             String
  repo               Repo     @relation(fields: [repoId], references: [id], onDelete: Cascade)
  userId             String
  user               User     @relation(fields: [userId], references: [id])
  taskDescription    String   @db.Text
  effortScore        Int
  effortLabel        String
  estimatedHoursMin  Int
  estimatedHoursMax  Int
  affectedFilesCount Int
  risksCount         Int
  fullResult         Json
  tokensUsed         Int      @default(0)
  createdAt          DateTime @default(now())

  @@index([repoId])
  @@index([userId])
}

Also add these back-relations to existing models:
- To Repo model: add these fields:
  generatedDoc      GeneratedDoc?
  prReviews         PrReview[]
  complexityScores  ComplexityScore[]

- To User model: add these fields:
  generatedDocs     GeneratedDoc[]
  prReviews         PrReview[]
  complexityScores  ComplexityScore[]

After editing the schema, run: npx prisma db push
(Run this command from the directory that contains schema.prisma)

Then run: npx prisma generate

Verify all 3 new tables exist by running: npx prisma studio
(You don't need to wait for me to open the browser — just confirm the command ran without errors)

SETUP STEP 2 — Install missing frontend packages.

Check /apps/web/package.json. If any of these are missing, install them:
- react-markdown
- remark-gfm
- rehype-highlight
- highlight.js

Run in /apps/web if needed:
npm install react-markdown remark-gfm rehype-highlight highlight.js

Also add this import to /apps/web/src/app/globals.css at the top:
@import 'highlight.js/styles/github-dark.css';

SETUP STEP 3 — Update sidebar navigation.

Open /apps/web/src/components/layout/Sidebar.tsx.
Update the navItems array to have exactly these 8 items in this order:

1. { href: '/dashboard', label: 'Dashboard', icon: Home }
2. { href: '/dashboard/repos', label: 'Repositories', icon: GitBranch }
3. { href: '/dashboard/chat', label: 'AI Chat', icon: MessageSquare }
4. { href: '/dashboard/pr-review', label: 'PR Review', icon: GitPullRequest }
5. { href: '/dashboard/complexity', label: 'Complexity', icon: BarChart2 }
6. { href: '/dashboard/docs', label: 'Documentation', icon: FileText }
7. { href: '/dashboard/billing', label: 'Billing', icon: CreditCard }
8. { href: '/dashboard/settings', label: 'Settings', icon: Settings }

Import GitPullRequest and BarChart2 from lucide-react if not already imported.

AFTER ALL 3 STEPS — TypeScript check:
Run: npx tsc --noEmit in /apps/api
Run: npx tsc --noEmit in /apps/web
Fix every error you find before reporting back.

Report: confirm all 3 setup steps done, new tables created, TypeScript clean in both apps.
