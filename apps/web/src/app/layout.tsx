import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { QueryProvider } from "@/providers/QueryProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "DevScope AI",
    template: "%s | DevScope AI",
  },
  description:
    "AI-powered developer productivity suite. Understand any codebase instantly.",
  keywords: [
    "AI",
    "developer tools",
    "code analysis",
    "GitHub",
    "documentation",
  ],
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ""}
    >
      <html lang="en" className={inter.variable}>
        <body className="font-sans antialiased">
          <QueryProvider>{children}</QueryProvider>
          <Toaster richColors closeButton position="top-center" />
        </body>
      </html>
    </ClerkProvider>
  );
}
