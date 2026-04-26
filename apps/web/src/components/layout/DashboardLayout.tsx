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
    <div className="flex min-h-screen">
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-label="Close menu"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}
      <Sidebar
        mobileOpen={mobileNavOpen}
        onNavigate={() => setMobileNavOpen(false)}
      />
      <div className="flex flex-1 flex-col md:pl-sidebar">
        <Header onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 px-6 py-6">
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
