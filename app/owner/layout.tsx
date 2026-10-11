import type { ReactNode } from "react";

import { requireProfile } from "@/features/auth/services/profile-service";

export const instant = false;

export default async function OwnerLayout({ children }: { children: ReactNode }) {
  await requireProfile("owner");
  return children;
}