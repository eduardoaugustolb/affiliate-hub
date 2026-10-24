import type { ComponentPropsWithoutRef } from "react";
export function Skeleton({
  className = "",
  ...props
}: ComponentPropsWithoutRef<"span">) {
  return (
    <span
      {...props}
      aria-hidden="true"
      className={`app-skeleton ${className}`}
    />
  );
}
