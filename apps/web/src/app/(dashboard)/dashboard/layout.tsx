import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardSectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
