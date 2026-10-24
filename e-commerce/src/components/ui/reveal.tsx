"use client";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { type ComponentPropsWithoutRef, type RefObject, useRef } from "react";

gsap.registerPlugin(useGSAP);
type Props = ComponentPropsWithoutRef<"div"> & {
  as?: "div" | "section" | "figure";
  transitionKey?: string | number;
  delay?: number;
  ready?: boolean;
  onRevealComplete?: () => void;
  containerRef?: RefObject<HTMLDivElement | null>;
};
export function Reveal({
  as: Tag = "div",
  transitionKey,
  delay = 0,
  ready = true,
  onRevealComplete,
  containerRef,
  children,
  ...props
}: Props) {
  const internal = useRef<HTMLDivElement>(null);
  const root = containerRef ?? internal;
  useGSAP(
    () => {
      if (!root.current || !ready) return;
      const media = gsap.matchMedia();
      media.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduced: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          if (context.conditions?.reduced) {
            onRevealComplete?.();
            return;
          }
          const children = root.current?.children;
          gsap.fromTo(
            children?.length ? children : root.current,
            { opacity: 0, y: 14 },
            {
              opacity: 1,
              y: 0,
              duration: 0.45,
              delay,
              stagger: 0.045,
              ease: "power2.out",
              clearProps: "opacity,transform",
              onComplete: onRevealComplete,
            },
          );
        },
      );
      return () => media.revert();
    },
    {
      scope: root,
      dependencies: [transitionKey, delay, ready, onRevealComplete],
      revertOnUpdate: true,
    },
  );
  return (
    <Tag {...props} ref={root}>
      {children}
    </Tag>
  );
}
