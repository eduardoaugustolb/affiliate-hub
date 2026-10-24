import type { ReactNode } from "react";
import { StoreShell } from "@/components/storefront/store-shell";
export default function Layout({ children }: { children: ReactNode }) {
  return <StoreShell>{children}</StoreShell>;
}
