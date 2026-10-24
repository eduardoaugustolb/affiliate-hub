"use client";

import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";

import { AnimatedPanel } from "./animated-panel";

type Option = { value: string; label: string };
type Props = {
  label: string;
  name: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

/** Select-only combobox: DOM focus stays on the trigger while exploring options. */
export function Select({
  label,
  name,
  options,
  value,
  onChange,
  disabled = false,
}: Props) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLDivElement>(null);
  const search = useRef({ text: "", time: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selected = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const commit = (index: number) => {
    if (disabled || !options[index]) return;
    onChange(options[index].value);
    setOpen(false);
  };
  const expand = () => {
    setActive(selected);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);
  useEffect(() => {
    if (open)
      root.current
        ?.querySelector(`#${CSS.escape(`${id}-option-${active}`)}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [open, active, id]);

  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || !options.length) return;
    const key = event.key;
    if (key === "Tab") {
      if (open) commit(active);
      return;
    }
    if (key === "Escape") {
      if (open) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
      }
      return;
    }
    if (key === "Enter" || key === " ") {
      event.preventDefault();
      if (open) commit(active);
      else expand();
      return;
    }
    if (
      ["ArrowDown", "ArrowUp", "Home", "End", "PageDown", "PageUp"].includes(
        key,
      )
    ) {
      event.preventDefault();
      if (event.altKey && key === "ArrowUp" && open) {
        commit(active);
        return;
      }
      const current = open ? active : selected;
      const next =
        key === "Home"
          ? 0
          : key === "End"
            ? options.length - 1
            : !open
              ? current
              : current +
                (key === "ArrowDown"
                  ? 1
                  : key === "ArrowUp"
                    ? -1
                    : key === "PageDown"
                      ? 10
                      : -10);
      setActive(Math.max(0, Math.min(options.length - 1, next)));
      setOpen(true);
      return;
    }
    if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      const text =
        now - search.current.time < 700 ? search.current.text + key : key;
      search.current = { text, time: now };
      const query = [...text].every((char) => char === text[0]) ? key : text;
      const normalize = (text: string) =>
        text
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
      const start = open ? active : selected;
      for (let offset = 1; offset <= options.length; offset++) {
        const index = (start + offset) % options.length;
        if (normalize(options[index].label).startsWith(normalize(query))) {
          setActive(index);
          break;
        }
      }
      setOpen(true);
    }
  };

  return (
    <div ref={root} className="relative min-w-0">
      <span
        id={`${id}-label`}
        className="text-[0.65rem] uppercase tracking-[0.14em] text-muted"
      >
        {label}
      </span>
      <input type="hidden" name={name} value={value} disabled={disabled} />
      <div
        ref={trigger}
        id={id}
        role="combobox"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-haspopup="listbox"
        aria-labelledby={`${id}-label`}
        aria-activedescendant={open ? `${id}-option-${active}` : undefined}
        onKeyDown={keyDown}
        onBlur={() => {
          if (open && !disabled) commit(active);
        }}
        onClick={() => {
          if (disabled) return;
          trigger.current?.focus();
          if (open) setOpen(false);
          else expand();
        }}
        className="mt-2 flex min-h-12 w-full cursor-pointer items-center justify-between gap-4 border-b border-line bg-ink text-sm text-bone focus-visible:bg-bone/10"
      >
        <span>{options[selected]?.label ?? "Selecione"}</span>
        <span aria-hidden="true" className="text-muted">
          {open ? "−" : "+"}
        </span>
      </div>
      <AnimatedPanel
        id={`${id}-list`}
        role="listbox"
        aria-labelledby={`${id}-label`}
        open={open}
        className="absolute inset-x-0 top-full z-50 mt-2 border border-line bg-surface shadow-xl"
      >
        <div
          data-lenis-prevent
          className="max-h-64 overflow-y-auto overscroll-contain p-1"
        >
          {options.map((option, index) => (
            <div
              key={option.value}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={index === active}
              tabIndex={-1}
              onPointerDown={(event) => event.preventDefault()}
              onPointerMove={() => setActive(index)}
              onClick={() => {
                commit(index);
                trigger.current?.focus();
              }}
              onKeyDown={keyDown}
              className={`flex min-h-12 cursor-pointer items-center justify-between gap-4 px-3 text-sm ${index === active ? "bg-bone text-ink" : "text-bone"}`}
            >
              {option.label}
              <span aria-hidden="true">
                {option.value === value ? "✓" : ""}
              </span>
            </div>
          ))}
        </div>
      </AnimatedPanel>
    </div>
  );
}
