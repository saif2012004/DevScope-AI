"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { PageTitleProvider } from "@/context/PageTitleContext";
import { useAuthSync } from "@/hooks/useAuthSync";

function DashboardChrome({ children }: { children: ReactNode }) {
  useAuthSync();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="relative flex min-h-screen bg-background">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-[hsl(263_85%_60%/0.10)] blur-3xl" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-[hsl(199_89%_60%/0.06)] blur-3xl" />
      </div>

      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          aria-label="Close menu"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <Sidebar
        mobileOpen={mobileNavOpen}
        onNavigate={() => setMobileNavOpen(false)}
      />

      <div className="relative z-10 flex flex-1 flex-col md:pl-sidebar">
        <Header onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 px-6 py-8">
          <div className="mx-auto w-full max-w-[var(--content-max-width)]">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <PageTitleProvider>
      <DashboardChrome>{children}</DashboardChrome>
    </PageTitleProvider>
  );
}
