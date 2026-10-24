"use client";
import {
  createContext,
  type ReactNode,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useScrollLock } from "@/components/providers/smooth-scroll";
import { BrandLoader } from "./brand-loader";

const ApiReady = createContext<{ ready: boolean; resolve: () => void } | null>(
  null,
);
export function useApiReady() {
  return useContext(ApiReady)?.ready ?? true;
}

// Keep the loader mounted until ApiContent confirms that streamed data committed.
export function ApiBoundary({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useScrollLock(!ready);
  const resolve = useCallback(() => setReady(true), []);
  const value = useMemo(() => ({ ready, resolve }), [ready, resolve]);
  return (
    <ApiReady value={value}>
      {!ready && <BrandLoader overlay />}
      <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
        {children}
      </Suspense>
    </ApiReady>
  );
}

// Render this only after server API reads resolve. Its commit ends the loader.
export function ApiContent({ children }: { children: ReactNode }) {
  const context = useContext(ApiReady);
  const resolve = context?.resolve;
  useEffect(() => {
    resolve?.();
  }, [resolve]);
  return children;
}
