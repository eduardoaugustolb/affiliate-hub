"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useHeroEntrance } from "@/components/home/hero-reveal";
import { useScrollLock } from "@/components/providers/smooth-scroll";
import { AnimatedPanel } from "@/components/ui/animated-panel";
import { BrandIcon } from "@/components/ui/brand-icon";
import { Button } from "@/components/ui/button";
import { GlitchText } from "@/components/ui/glitch-text";
import type { BrandIconName } from "@/lib/brand-icons";
import { DesktopNavigation } from "./desktop-navigation";

const sections: { id: string; label: string; icon: BrandIconName }[] = [
  { id: "pecas", label: "Peças", icon: "grid" },
  { id: "filtros", label: "Filtrar peças", icon: "layers" },
  { id: "como-encontrar", label: "Como encontrar", icon: "tag" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  useScrollLock(open);
  const [active, setActive] = useState("pecas");
  const header = useRef<HTMLElement>(null);
  useHeroEntrance(header, 0);

  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting)
            setActive(
              entry.target.id ||
                entry.target.getAttribute("data-scroll-anchor") ||
                "pecas",
            );
      },
      { rootMargin: "-10% 0px -50% 0px", threshold: 0 },
    );
    for (const section of sections) {
      const target =
        document.getElementById(section.id) ??
        document.querySelector(`[data-scroll-anchor="${section.id}"]`);
      if (target) observer.observe(target);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !header.current?.contains(event.target)
      )
        setOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 768px)");
    const resize = () => {
      if (desktop.matches) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", handleEscape);
    desktop.addEventListener("change", resize);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", handleEscape);
      desktop.removeEventListener("change", resize);
    };
  }, [open]);

  return (
    <header
      ref={header}
      data-hero-reveal
      className="sticky top-0 z-40 grid min-h-[var(--site-header-height)] grid-cols-[minmax(0,1fr)_auto] items-center gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)] border-b border-line bg-ink/95 px-[clamp(1.25rem,3.2vw,4rem)] backdrop-blur-md"
    >
      <Link
        href="/#inicio"
        onClick={() => setOpen(false)}
        aria-label="BLACK HEM — início"
        className="whitespace-nowrap font-display text-[clamp(1.4rem,2.2vw,1.9rem)] font-normal leading-normal [font-synthesis:none] [font-variant-ligatures:discretionary-ligatures]"
      >
        BLACK HEM
      </Link>
      <DesktopNavigation
        sections={sections}
        active={active}
        onSelect={setActive}
      />
      <a
        href="#pecas"
        className="hidden min-h-11 items-center justify-self-end gap-3 whitespace-nowrap text-xs text-muted hover:text-bone md:inline-flex"
      >
        <BrandIcon name="grid" className="size-4" />{" "}
        <GlitchText text="Explorar peças" />
      </a>
      <div className="justify-self-end md:hidden">
        <Button
          variant="text"
          ref={toggle}
          type="button"
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={open ? "Fechar navegação" : "Abrir navegação"}
          onClick={() => setOpen((value) => !value)}
          className="!px-1 min-h-11 gap-3 text-xs"
        >
          <GlitchText text={open ? "Fechar" : "Menu"} />
          <BrandIcon name={open ? "close" : "menu"} />
        </Button>
      </div>
      <AnimatedPanel
        as="nav"
        id="mobile-navigation"
        aria-label="Navegação no celular"
        open={open}
        className="absolute inset-x-0 top-full border-b border-line bg-ink md:hidden"
      >
        <div className="px-5 py-5">
          <ul className="divide-y divide-line">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  aria-current={active === section.id ? "location" : undefined}
                  onClick={() => {
                    setActive(section.id);
                    setOpen(false);
                    document
                      .getElementById(section.id)
                      ?.focus({ preventScroll: true });
                  }}
                  className="flex min-h-18 items-center justify-between gap-5 text-lg"
                >
                  <GlitchText text={section.label} />
                  <BrandIcon
                    name={section.icon}
                    className="size-6 text-muted"
                  />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </AnimatedPanel>
    </header>
  );
}
