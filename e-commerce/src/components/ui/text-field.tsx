"use client";

import { type ComponentPropsWithoutRef, useId } from "react";

type Props = ComponentPropsWithoutRef<"input"> & {
  label: string;
  hint?: string;
};

export function TextField({
  label,
  hint,
  id: suppliedId,
  className = "",
  ...props
}: Props) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="text-[0.65rem] uppercase tracking-[0.14em] text-muted"
      >
        {label}
      </label>
      <input
        {...props}
        id={id}
        aria-describedby={hint ? `${id}-hint` : props["aria-describedby"]}
        className={`mt-2 min-h-12 w-full appearance-none rounded-none border-0 border-b border-line bg-ink px-0 text-sm text-bone outline-none focus:outline-none focus:ring-0 focus:shadow-none placeholder:text-muted ${className}`}
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-2 text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
