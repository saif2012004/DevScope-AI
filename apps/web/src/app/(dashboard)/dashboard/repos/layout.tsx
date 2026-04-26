import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Repositories",
};

export default function ReposLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
