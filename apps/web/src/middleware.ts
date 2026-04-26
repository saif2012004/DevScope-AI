import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  if (req.nextUrl.pathname === "/") {
    if (userId) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  if (req.nextUrl.pathname.startsWith("/dashboard")) {
    if (!userId) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }
  }
});
