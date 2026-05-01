import { clerkMiddleware } from "@clerk/nextjs/server";

// Minimal middleware — lets Clerk handle its own session handshake.
// Route protection is handled at the layout level:
//   - /dashboard/** → apps/web/src/app/(dashboard)/layout.tsx
//   - /           → apps/web/src/app/page.tsx (server component)
export default clerkMiddleware(async () => {});
