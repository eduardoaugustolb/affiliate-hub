"use client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";

gsap.registerPlugin(ScrollTrigger);
const AnchorScroll = createContext<{
  resetTop: () => void;
  requestAnchor: (id: string) => void;
} | null>(null);
export const useAnchorScroll = () => useContext(AnchorScroll);

const ScrollLock = createContext<
  ((key: symbol, locked: boolean) => void) | null
>(null);
export function useScrollLock(locked: boolean) {
  const update = useContext(ScrollLock);
  useEffect(() => {
    if (!locked || !update) return;
    const key = Symbol("scroll-lock");
    update(key, true);
    return () => update(key, false);
  }, [locked, update]);
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  const scroller = useRef<Lenis | null>(null);
  const locks = useRef(new Set<symbol>());
  const pendingAnchor = useRef<string | null>(null);
  const flushAnchor = useCallback(() => {
    if (locks.current.size || !pendingAnchor.current) return;
    const target = document.getElementById(pendingAnchor.current);
    if (!target) return;
    pendingAnchor.current = null;
    const offset =
      Number.parseFloat(
        getComputedStyle(document.documentElement).scrollPaddingTop,
      ) || 0;
    const top = Math.max(
      0,
      window.scrollY + target.getBoundingClientRect().top - offset,
    );
    if (scroller.current)
      scroller.current.scrollTo(top, {
        onComplete: () => target.focus({ preventScroll: true }),
      });
    else {
      window.scrollTo({ top, behavior: "auto" });
      target.focus({ preventScroll: true });
    }
  }, []);
  const requestAnchor = useCallback(
    (id: string) => {
      pendingAnchor.current = id;
      flushAnchor();
    },
    [flushAnchor],
  );
  const resetTop = useCallback(() => {
    pendingAnchor.current = null;
    if (scroller.current)
      scroller.current.scrollTo(0, { force: true, immediate: true });
    else window.scrollTo({ top: 0, behavior: "auto" });
  }, []);
  const anchors = useMemo(
    () => ({ requestAnchor, resetTop }),
    [requestAnchor, resetTop],
  );
  const lock = useCallback(
    (key: symbol, locked: boolean) => {
      if (locked) locks.current.add(key);
      else locks.current.delete(key);
      if (locks.current.size) scroller.current?.stop();
      else {
        scroller.current?.start();
        flushAnchor();
      }
    },
    [flushAnchor],
  );
  const value = useMemo(() => lock, [lock]);
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      // Outfit instantiates Lenis with defaults; make its motion settings explicit.
      const lenis = new Lenis({
        lerp: 0.1,
        smoothWheel: true,
        syncTouch: false,
        autoRaf: false,
      });
      scroller.current = lenis;
      if (locks.current.size) lenis.stop();
      const update = (time: number) => lenis.raf(time * 1000);
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(update);
      gsap.ticker.lagSmoothing(0);
      ScrollTrigger.refresh();
      return () => {
        gsap.ticker.remove(update);
        lenis.off("scroll", ScrollTrigger.update);
        lenis.destroy();
        scroller.current = null;
        gsap.ticker.lagSmoothing(500, 33);
      };
    });
    return () => media.revert();
  }, []);
  return (
    <ScrollLock value={value}>
      <AnchorScroll value={anchors}>{children}</AnchorScroll>
    </ScrollLock>
  );
}
