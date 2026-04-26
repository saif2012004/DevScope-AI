"use client";

import { FileText } from "lucide-react";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/shared/EmptyState";
import { useSetPageTitle } from "@/context/PageTitleContext";

export default function DocsPage() {
  useSetPageTitle("Documentation");
  const router = useRouter();

  return (
    <div className="space-y-8">
      <EmptyState
        icon={FileText}
        title="No documentation generated yet"
        description="Add and index a repository, then generate documentation from it."
        action={{
          label: "Add Repository",
          onClick: () => router.push("/dashboard/repos"),
        }}
      />
    </div>
  );
}
