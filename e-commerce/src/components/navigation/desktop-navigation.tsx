"use client";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";
import { useHeroReady } from "@/components/home/hero-intro";
import { BrandIcon } from "@/components/ui/brand-icon";
import { GlitchText } from "@/components/ui/glitch-text";
import type { BrandIconName } from "@/lib/brand-icons";

gsap.registerPlugin(useGSAP);
type Props = {
  sections: { id: string; label: string; icon: BrandIconName }[];
  active: string;
  onSelect: (id: string) => void;
};
export function DesktopNavigation({ sections, active, onSelect }: Props) {
  const navRef = useRef<HTMLElement>(null);
  const ready = useHeroReady();
  useGSAP(
    (_, contextSafe) => {
      const element = navRef.current;
      if (!contextSafe || !element) return;
      const media = gsap.matchMedia();
      media.add(
        {
          reduced: "(prefers-reduced-motion: reduce)",
          motion: "(prefers-reduced-motion: no-preference)",
        },
        (context) => {
          const reduced = Boolean(context.conditions?.reduced);
          const removeListeners: (() => void)[] = [];
          const listen = (
            element: Element,
            event: string,
            callback: () => void,
          ) => {
            const handler = contextSafe(callback);
            element.addEventListener(event, handler);
            removeListeners.push(() =>
              element.removeEventListener(event, handler),
            );
          };
          for (const link of element.querySelectorAll("a[aria-label]")) {
            const [marker, icon, tooltip] = Array.from(link.children);
            let hovered = false;
            const update = () => {
              const focused = link === document.activeElement;
              const active = link.getAttribute("aria-current") === "location";
              const options = {
                duration: reduced ? 0 : 0.2,
                overwrite: true,
              };
              gsap.to(marker, {
                scale: active || hovered || focused ? 1.25 : 1,
                ...options,
              });
              gsap.to(icon, {
                opacity: active || hovered || focused ? 1 : 0,
                ...options,
              });
              gsap.to(tooltip, {
                opacity: hovered || focused ? 1 : 0,
                ...options,
              });
            };
            listen(link, "pointerenter", () => {
              hovered = true;
              update();
            });
            listen(link, "pointerleave", () => {
              hovered = false;
              update();
            });
            listen(link, "focus", update);
            listen(link, "blur", update);
            const observer = new MutationObserver(contextSafe(update));
            observer.observe(link, {
              attributes: true,
              attributeFilter: ["aria-current"],
            });
            removeListeners.push(() => observer.disconnect());
          }
          return () => {
            for (const remove of removeListeners) remove();
          };
        },
      );
      return () => media.revert();
    },
    { scope: navRef },
  );

  useGSAP(
    () => {
      const nav = navRef.current;
      if (!nav || !ready) return;
      const media = gsap.matchMedia();
      media.add(
        "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
        () => {
          const line = nav.querySelector("[data-nav-line]");
          const items = Array.from(nav.querySelectorAll("li"));
          const timeline = gsap.timeline({
            delay: 1.05,
            defaults: { ease: "power2.out" },
          });
          gsap.set(items, { autoAlpha: 0, y: 4 });
          gsap.set(line, { scaleX: 0 });
          items.forEach((item, index) => {
            if (index > 0)
              timeline.to(line, {
                scaleX: index / (items.length - 1),
                duration: 0.4,
                ease: "none",
              });
            timeline.to(item, { autoAlpha: 1, y: 0, duration: 0.2 });
          });
        },
      );
      return () => media.revert();
    },
    { scope: navRef, dependencies: [ready], revertOnUpdate: true },
  );
  return (
    <nav
      ref={navRef}
      aria-label="Navegação principal"
      className="relative hidden w-full max-w-[480px] justify-self-center md:block"
    >
      <div
        data-nav-line
        aria-hidden="true"
        className="absolute inset-x-6 top-1/2 h-px origin-left bg-bone/20"
      />
      <ul className="relative flex items-center justify-between">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-label={section.label}
              aria-current={active === section.id ? "location" : undefined}
              onClick={() => onSelect(section.id)}
              className="group relative flex size-12 items-center justify-center"
            >
              <span
                className={
                  "absolute size-2 rotate-45 border " +
                  (active === section.id
                    ? "scale-125 border-bone bg-ink"
                    : "border-bone/50 bg-bone/50")
                }
              />
              <span
                className={
                  "relative bg-ink p-1 text-bone " +
                  (active === section.id ? "opacity-100" : "opacity-0")
                }
              >
                <BrandIcon name={section.icon} className="size-5" />
              </span>
              <span className="pointer-events-none absolute top-11 whitespace-nowrap bg-ink px-2 py-1 text-[0.65rem] text-bone opacity-0">
                <GlitchText text={section.label} />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
