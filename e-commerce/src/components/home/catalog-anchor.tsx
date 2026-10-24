"use client";
import { useGSAP } from "@gsap/react";
import type { ComponentPropsWithoutRef } from "react";
import { useAnchorScroll } from "@/components/providers/smooth-scroll";
import { useHeroStage } from "./hero-intro";

/** Keep the native hash target unavailable until every entrance tween finishes. */
export function CatalogAnchor(props: ComponentPropsWithoutRef<"div">) {
  const { productsComplete } = useHeroStage();
  const scroll = useAnchorScroll();
  useGSAP(
    () => {
      const navigate = () => {
        if (window.location.hash !== "#pecas") return;
        if (productsComplete) scroll?.requestAnchor("pecas");
        else scroll?.resetTop();
      };
      navigate();
      window.addEventListener("hashchange", navigate);
      return () => window.removeEventListener("hashchange", navigate);
    },
    { dependencies: [productsComplete, scroll], revertOnUpdate: true },
  );
  return (
    <div
      {...props}
      id={productsComplete ? "pecas" : undefined}
      data-scroll-anchor="pecas"
    />
  );
}
