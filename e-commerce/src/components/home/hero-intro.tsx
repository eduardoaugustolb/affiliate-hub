"use client";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useScrollLock } from "@/components/providers/smooth-scroll";
import { useApiReady } from "@/components/ui/api-boundary";

const idle = () => {};
const HeroState = createContext({
  ready: false,
  titleComplete: false,
  controlsComplete: false,
  productsComplete: false,
  finishProduct: (_code: string) => {},
  startTitle: idle,
  finishTitle: idle,
  finishControls: idle,
});
export const useHeroReady = () => useContext(HeroState).ready;
export const useHeroStage = () => useContext(HeroState);

export function HeroIntro({
  children,
  productCodes,
}: {
  children: ReactNode;
  productCodes: string[];
}) {
  const [fontsReady, setFontsReady] = useState(false);
  const [titleComplete, setTitleComplete] = useState(false);
  const [controlsComplete, setControlsComplete] = useState(false);
  const [completed, setCompleted] = useState<Set<string>>(() => new Set());
  const apiReady = useApiReady();
  const ready = fontsReady && apiReady;
  const productsComplete =
    ready &&
    titleComplete &&
    controlsComplete &&
    productCodes.every((code) => completed.has(code));
  useScrollLock(!productsComplete);
  const finishProduct = useCallback(
    (code: string) =>
      setCompleted((previous) =>
        previous.has(code) ? previous : new Set([...previous, code]),
      ),
    [],
  );
  const startTitle = useCallback(() => {
    setCompleted(new Set());
    setTitleComplete(false);
    setControlsComplete(false);
  }, []);
  const finishTitle = useCallback(() => setTitleComplete(true), []);
  const finishControls = useCallback(() => setControlsComplete(true), []);
  const value = useMemo(
    () => ({
      ready,
      titleComplete: ready && titleComplete,
      controlsComplete: ready && titleComplete && controlsComplete,
      productsComplete,
      finishProduct,
      startTitle,
      finishTitle,
      finishControls,
    }),
    [
      ready,
      titleComplete,
      controlsComplete,
      productsComplete,
      finishProduct,
      startTitle,
      finishTitle,
      finishControls,
    ],
  );
  useEffect(() => {
    let disposed = false;
    void document.fonts.ready.then(() => {
      if (!disposed) setFontsReady(true);
    });
    return () => {
      disposed = true;
    };
  }, []);
  return (
    <HeroState value={value}>
      <div
        className="hero-intro"
        data-intro={ready ? "running" : "pending"}
        data-scroll-ready={productsComplete ? "true" : "false"}
        data-title={ready && titleComplete ? "ready" : "pending"}
        data-products={
          ready && titleComplete && controlsComplete ? "ready" : "pending"
        }
      >
        {children}
        <noscript>
          <style>{`.hero-intro #hero-title, .hero-intro [data-hero-reveal], .hero-intro [data-catalog-card] { visibility: visible !important; opacity: 1 !important; }`}</style>
        </noscript>
      </div>
    </HeroState>
  );
}
