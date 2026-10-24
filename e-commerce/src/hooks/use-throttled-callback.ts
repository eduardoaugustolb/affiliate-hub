"use client";

import { useEffect, useMemo, useRef } from "react";

/** Leading + trailing throttle: updates immediately and always delivers the last value. */
export function useThrottledCallback<T>(
  callback: (value: T) => void,
  interval = 200,
) {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const throttled = useMemo(() => {
    let lastRun = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pending: { value: T } | undefined;
    const invoke = () => {
      timer = undefined;
      if (!pending) return;
      const { value } = pending;
      pending = undefined;
      lastRun = Date.now();
      callbackRef.current(value);
    };
    const cancel = () => {
      clearTimeout(timer);
      timer = undefined;
      pending = undefined;
      lastRun = 0;
    };
    return {
      schedule(value: T) {
        pending = { value };
        const remaining = interval - (Date.now() - lastRun);
        if (remaining <= 0) {
          clearTimeout(timer);
          invoke();
        } else if (timer === undefined) {
          timer = setTimeout(invoke, remaining);
        }
      },
      flush(value: T) {
        cancel();
        pending = { value };
        invoke();
      },
      cancel,
    };
  }, [interval]);

  useEffect(() => () => throttled.cancel(), [throttled]);
  return throttled;
}
