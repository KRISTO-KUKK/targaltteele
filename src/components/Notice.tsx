import type { ReactNode } from "react";

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" | "success" }) {
  return <div className={`notice notice-${tone}`}>{children}</div>;
}
