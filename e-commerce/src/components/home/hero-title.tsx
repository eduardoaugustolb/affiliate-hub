"use client";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { useRef } from "react";
import { useHeroStage } from "./hero-intro";

gsap.registerPlugin(useGSAP, SplitText);
export function HeroTitle() {
  const ref = useRef<HTMLHeadingElement>(null);
  const { ready, startTitle, finishTitle } = useHeroStage();
  useGSAP(
    () => {
      const title = ref.current;
      if (!title || !ready) return;
      const media = gsap.matchMedia();
      media.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduced: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          if (context.conditions?.reduced) {
            finishTitle();
            return;
          }
          startTitle();
          const split = SplitText.create(title, {
            type: "words,chars",
            tag: "span",
            aria: "auto",
          });
          // SplitText leaves span wrappers inline; transforms require inline-block.
          gsap.set(split.chars, {
            display: "inline-block",
            position: "relative",
          });
          const first = split.chars[0];
          const second = split.chars[5];
          const rest = split.chars.filter(
            (char) => char !== first && char !== second,
          );
          const bounds = title.getBoundingClientRect();
          const fontSize = Number.parseFloat(getComputedStyle(title).fontSize);
          const firstBounds = first.getBoundingClientRect();
          const secondBounds = second.getBoundingClientRect();
          const left =
            bounds.left +
            (bounds.width - firstBounds.width - secondBounds.width) / 2;

          gsap
            .timeline({
              onComplete: finishTitle,
              defaults: { ease: "power2.out", force3D: true },
            })
            .fromTo(
              [first, second],
              {
                x: (index: number) =>
                  index === 0
                    ? `${(left - firstBounds.left) / fontSize}em`
                    : `${(left + firstBounds.width - secondBounds.left) / fontSize}em`,
              },
              { x: 0, duration: 1.25, ease: "power2.inOut" },
              0.15,
            )
            .fromTo(
              rest,
              { autoAlpha: 0, yPercent: 10 },
              { autoAlpha: 1, yPercent: 0, duration: 0.75, stagger: -0.06 },
              0.7,
            );
          gsap.set(title, { visibility: "visible" });
        },
      );
      return () => media.revert();
    },
    {
      scope: ref,
      dependencies: [ready, startTitle, finishTitle],
      revertOnUpdate: true,
    },
  );
  return (
    <div className="relative z-10">
      <h1
        ref={ref}
        id="hero-title"
        aria-label="BLACK HEM"
        className="relative z-10 m-0 w-full text-center whitespace-nowrap font-display text-[18.5vw] font-normal leading-[1.2] [font-kerning:none] [font-synthesis:none] [font-variant-ligatures:none] min-[900px]:text-[clamp(3.5rem,19vw,22rem)]"
      >
        BLACK HEM
      </h1>
    </div>
  );
}
