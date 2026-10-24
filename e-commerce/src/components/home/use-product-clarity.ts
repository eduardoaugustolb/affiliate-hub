"use client";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { RefObject } from "react";

gsap.registerPlugin(useGSAP);
export function useProductClarity(
  root: RefObject<HTMLDivElement | null>,
  filterId: string,
) {
  useGSAP(
    (_, contextSafe) => {
      const card = root.current;
      if (!card || !contextSafe) return;
      const image = card.querySelector("[data-clarity-image]");
      const displacement = card.querySelector("feDisplacementMap");
      const noise = card.querySelector("feTurbulence");
      const grain = card.querySelector("[data-card-grain]");
      if (!image || !displacement || !noise || !grain) return;
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        let animation: gsap.core.Timeline | undefined;
        const settle = contextSafe(() => {
          gsap.set(image, { clearProps: "filter,transform" });
          gsap.set(displacement, { attr: { scale: 0 } });
          gsap.set(grain, { opacity: 0 });
        });
        const reset = contextSafe(() => {
          animation?.kill();
          settle();
        });
        const play = contextSafe(() => {
          reset();
          gsap.set(image, { filter: `url(#${filterId})` });
          gsap.set(displacement, { attr: { scale: 16 } });
          gsap.set(noise, { attr: { seed: 1 } });
          gsap.set(grain, { opacity: 0.38 });
          animation = gsap
            .timeline({ onComplete: settle })
            .to(
              displacement,
              { attr: { scale: 0 }, duration: 0.5, ease: "power2.out" },
              0,
            )
            .to(
              noise,
              { attr: { seed: 8 }, duration: 0.45, ease: "steps(7)" },
              0,
            )
            .to(
              image,
              {
                keyframes: [
                  { x: -3, y: 1 },
                  { x: 2, y: -1 },
                  { x: -1, y: 0 },
                  { x: 0, y: 0 },
                ],
                duration: 0.45,
                ease: "steps(1)",
              },
              0,
            )
            .to(grain, { opacity: 0, duration: 0.5, ease: "power2.out" }, 0);
        });
        const enter = (event: PointerEvent) => {
          if (
            event.pointerType === "mouse" &&
            matchMedia("(hover: hover)").matches
          )
            play();
        };
        const down = (event: PointerEvent) => {
          if (event.pointerType !== "mouse") play();
        };
        const focus = () => {
          if (card.querySelector("[data-product-link]:focus-visible")) play();
        };
        card.addEventListener("pointerenter", enter);
        card.addEventListener("pointerleave", reset);
        card.addEventListener("pointerdown", down);
        card.addEventListener("focusin", focus);
        card.addEventListener("focusout", reset);
        return () => {
          animation?.kill();
          card.removeEventListener("pointerenter", enter);
          card.removeEventListener("pointerleave", reset);
          card.removeEventListener("pointerdown", down);
          card.removeEventListener("focusin", focus);
          card.removeEventListener("focusout", reset);
        };
      });
      return () => media.revert();
    },
    { scope: root, dependencies: [filterId], revertOnUpdate: true },
  );
}
