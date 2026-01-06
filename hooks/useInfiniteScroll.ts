import { useEffect, useRef } from 'react';

interface UseInfiniteScrollOptions {
  enabled?: boolean;
  rootMargin?: string;
}

/**
 * Hook for infinite scroll using IntersectionObserver API
 * More performant than scroll event listeners
 */
export function useInfiniteScroll(
  callback: () => void,
  options: UseInfiniteScrollOptions = {}
) {
  const { enabled = true, rootMargin = '300px' } = options;
  const sentinelRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(callback);

  // Keep callback ref up to date without recreating observer
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          callbackRef.current();
        }
      },
      {
        root: null, // viewport
        rootMargin,
        threshold: 0.1,
      }
    );

    const sentinel = sentinelRef.current;
    observer.observe(sentinel);

    return () => {
      if (sentinel) {
        observer.unobserve(sentinel);
      }
    };
  }, [enabled, rootMargin]);

  return sentinelRef;
}

