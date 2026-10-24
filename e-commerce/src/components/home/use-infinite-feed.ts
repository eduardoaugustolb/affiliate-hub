"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useInfiniteFeed<T>(items: T[], pageSize = 12) {
  const [limit, setLimit] = useState(pageSize);
  const sentinel = useRef<HTMLDivElement>(null);
  const hasMore = limit < items.length;
  const loadMore = useCallback(
    () => setLimit((current) => current + pageSize),
    [pageSize],
  );
  const reset = () => setLimit(pageSize);

  useEffect(() => {
    const target = sentinel.current;
    if (limit >= items.length || !target || !("IntersectionObserver" in window))
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          // One batch per observation; reconnect after the new items render.
          observer.disconnect();
          loadMore();
        }
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [items.length, loadMore, limit]);

  return { items: items.slice(0, limit), hasMore, loadMore, reset, sentinel };
}
