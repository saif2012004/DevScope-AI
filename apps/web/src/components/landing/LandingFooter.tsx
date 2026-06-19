import Link from "next/link";

import { Logo } from "@/components/shared/Logo";

export function LandingFooter() {
  return (
    <footer className="border-t border-white/10 px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-8 md:flex-row">
          <div>
            <Logo size="md" />
            <p className="mt-3 max-w-xs text-sm text-white/40">
              AI-powered developer productivity suite for modern engineering teams.
            </p>
          </div>
          <div className="flex gap-12">
            <div>
              <p className="mb-4 text-xs font-medium uppercase tracking-wider text-white/60">
                Product
              </p>
              <a
                href="#features"
                className="mb-2 block text-sm text-white/40 transition-colors hover:text-white"
              >
                Features
              </a>
              <a
                href="#pricing"
                className="mb-2 block text-sm text-white/40 transition-colors hover:text-white"
              >
                Pricing
              </a>
              <a
                href="https://github.com/saif2012004"
                target="_blank"
                rel="noopener noreferrer"
                className="mb-2 block text-sm text-white/40 transition-colors hover:text-white"
              >
                GitHub
              </a>
            </div>
            <div>
              <p className="mb-4 text-xs font-medium uppercase tracking-wider text-white/60">
                Links
              </p>
              <Link
                href="/sign-in"
                className="mb-2 block text-sm text-white/40 transition-colors hover:text-white"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="mb-2 block text-sm text-white/40 transition-colors hover:text-white"
              >
                Get started
              </Link>
              <Link
                href="/dashboard"
                className="mb-2 block text-sm text-white/40 transition-colors hover:text-white"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-12 border-t border-white/10 pt-8 text-center">
          <p className="text-xs text-white/30">
            © 2026 DevScope AI · Built by Saif ur Rehman · FAST NUCES Islamabad
          </p>
        </div>
      </div>
    </footer>
  );
}
