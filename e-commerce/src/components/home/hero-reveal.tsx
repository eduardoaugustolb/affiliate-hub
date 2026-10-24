"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { type ComponentPropsWithoutRef, type RefObject, useRef } from "react";
import { useHeroStage } from "./hero-intro";

gsap.registerPlugin(useGSAP);

// Shared entrance primitive; targets only the element owned by the caller.
export function useHeroEntrance(
  ref: RefObject<HTMLElement | null>,
  order?: number,
  staggerItems = false,
) {
  const { ready, titleComplete, finishControls } = useHeroStage();
  const canStart = order === 0 ? ready : titleComplete;
  useGSAP(
    () => {
      const element = ref.current;
      if (!canStart || order === undefined || !element) return;
      const media = gsap.matchMedia();
      media.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduced: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          if (context.conditions?.reduced) {
            if (order === 1) finishControls();
            return;
          }
          const targets = staggerItems
            ? element.querySelectorAll("[data-hero-item]")
            : element;
          if (staggerItems) gsap.set(element, { visibility: "visible" });
          gsap.fromTo(
            targets,
            { autoAlpha: 0, y: 20 },
            {
              autoAlpha: 1,
              y: 0,
              duration: order === 1 ? 0.4 : 0.7,
              stagger: staggerItems ? { amount: 0.22 } : 0,
              ease: "power2.out",
              delay: order === 0 ? 0.95 : (order - 1) * 0.1,
              onComplete: order === 1 ? finishControls : undefined,
              force3D: true,
            },
          );
        },
      );
      return () => media.revert();
    },
    {
      scope: ref,
      dependencies: [canStart, order, staggerItems, finishControls],
      revertOnUpdate: true,
    },
  );
  return canStart;
}

type Props = ComponentPropsWithoutRef<"div"> & {
  as?: "div" | "section" | "footer";
  order: number;
  staggerItems?: boolean;
};

export function HeroReveal({
  as: Tag = "div",
  order,
  staggerItems = false,
  ...props
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const canStart = useHeroEntrance(ref, order, staggerItems);
  return (
    <Tag
      {...props}
      ref={ref}
      data-hero-reveal
      data-entrance={canStart ? "ready" : "pending"}
    />
  );
}
