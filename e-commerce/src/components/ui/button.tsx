"use client";
import type { ComponentPropsWithRef } from "react";
import { GlitchText } from "./glitch-text";

type Props = ComponentPropsWithRef<"button"> & {
  variant?: "primary" | "text" | "outline";
};
export function Button({
  variant = "primary",
  className = "",
  type = "button",
  children,
  ...props
}: Props) {
  return (
    <button
      {...props}
      type={type}
      className={`app-button app-button--${variant} ${className}`}
    >
      <span className="app-button-label">
        {typeof children === "string" ? (
          <GlitchText text={children} />
        ) : (
          children
        )}
      </span>
    </button>
  );
}
