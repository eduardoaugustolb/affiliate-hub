"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { type ComponentPropsWithoutRef, useRef } from "react";

gsap.registerPlugin(useGSAP);

type Props = Omit<ComponentPropsWithoutRef<"div">, "hidden" | "style"> & {
  open: boolean;
  expandedOverflow?: "hidden" | "visible";
  as?: "div" | "nav";
};

/** Keeps the exit visible, but removes closed content from focus and accessibility. */
export function AnimatedPanel({
  open,
  expandedOverflow = "hidden",
  as: Tag = "div",
  children,
  ...props
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const panel = ref.current;
      if (!panel) return;
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (open && panel.hidden) {
        panel.hidden = false;
        gsap.set(panel, { height: 0, autoAlpha: 0, y: -6 });
      }
      if (!open && panel.hidden) return;
      gsap.set(panel, { overflow: "hidden" });
      gsap.to(panel, {
        height: open ? "auto" : 0,
        autoAlpha: open ? 1 : 0,
        y: open ? 0 : -6,
        duration: reduced ? 0 : open ? 0.32 : 0.22,
        ease: open ? "power2.out" : "power2.inOut",
        overwrite: true,
        onComplete: () => {
          if (!open) panel.hidden = true;
          else gsap.set(panel, { overflow: expandedOverflow });
        },
      });
    },
    { scope: ref, dependencies: [open, expandedOverflow] },
  );

  return (
    <Tag
      {...props}
      ref={ref}
      hidden
      inert={!open}
      aria-hidden={!open}
      style={{ height: 0, opacity: 0, overflow: "hidden" }}
    >
      {children}
    </Tag>
  );
}
