import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6">
      <p className="text-8xl font-bold tracking-tight text-brand md:text-9xl">
        404
      </p>
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Page not found
        </h1>
        <p className="mt-2 text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
      </div>
      <Button asChild size="lg">
        <Link href="/dashboard">← Back to Dashboard</Link>
      </Button>
    </div>
  );
}
