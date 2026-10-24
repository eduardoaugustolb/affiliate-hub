"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { useRef } from "react";

gsap.registerPlugin(useGSAP, ScrambleTextPlugin);

export function GlitchText({ text }: { text: string }) {
  const visual = useRef<HTMLSpanElement>(null);
  useGSAP(
    (_, contextSafe) => {
      const element = visual.current;
      const control = element?.closest("a, button");
      if (!element || !control || !contextSafe) return;
      // Previous animation cleanup restores its old label; apply the new prop.
      element.textContent = text;
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        let tween: gsap.core.Tween | undefined;
        const reset = () => {
          tween?.kill();
          element.textContent = text;
        };
        const play = contextSafe(() => {
          if (control.matches(":disabled, [aria-disabled='true']")) return;
          reset();
          tween = gsap.to(element, {
            duration: 0.45,
            ease: "none",
            scrambleText: {
              text,
              chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_/#",
              speed: 0.7,
              revealDelay: 0.04,
              tweenLength: false,
            },
            onComplete: () => {
              element.textContent = text;
            },
          });
        });
        const hover = () => {
          if (window.matchMedia("(hover: hover)").matches) play();
        };
        const focus = () => {
          if (control.matches(":focus-visible")) play();
        };
        control.addEventListener("pointerenter", hover);
        control.addEventListener("pointerleave", reset);
        control.addEventListener("focus", focus);
        control.addEventListener("blur", reset);
        return () => {
          control.removeEventListener("pointerenter", hover);
          control.removeEventListener("pointerleave", reset);
          control.removeEventListener("focus", focus);
          control.removeEventListener("blur", reset);
          reset();
        };
      });
      return () => media.revert();
    },
    { scope: visual, dependencies: [text], revertOnUpdate: true },
  );

  return (
    <span className="relative inline-grid">
      <span className="sr-only">{text}</span>
      <span
        aria-hidden="true"
        className="invisible col-start-1 row-start-1 whitespace-pre"
      >
        {text}
      </span>
      <span
        ref={visual}
        aria-hidden="true"
        className="absolute inset-0 whitespace-pre"
      >
        {text}
      </span>
    </span>
  );
}
