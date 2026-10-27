"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getApiJson } from "@/app/client/api/http";

interface LazyPublicDataOptions {
  /** How far before the section enters the viewport that loading should begin. */
  rootMargin?: string;
}

interface LazyPublicDataResult<T> {
  ref: (node: HTMLElement | null) => void;
  data: T | null;
  loading: boolean;
  error: string | null;
  started: boolean;
  reload: () => void;
}

/**
 * Loads one public CMS resource only when its section is close to the viewport.
 * There is deliberately no artificial delay: the section becomes ready as soon as
 * the server response arrives.
 */
export function useLazyPublicData<T>(
  url: string,
  { rootMargin = "900px 0px" }: LazyPublicDataOptions = {},
): LazyPublicDataResult<T> {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const generation = useRef(0);

  const ref = useCallback((nextNode: HTMLElement | null) => setNode(nextNode), []);

  const load = useCallback(async () => {
    const requestId = ++generation.current;
    setStarted(true);
    setLoading(true);
    setError(null);

    try {
      const payload = await getApiJson<T>(url);
      if (requestId !== generation.current) return;
      setData(payload);
    } catch (cause) {
      if (requestId !== generation.current) return;
      setError(cause instanceof Error ? cause.message : "Could not load this section.");
    } finally {
      if (requestId === generation.current) setLoading(false);
    }
  }, [url]);

  const reload = useCallback(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!node) return;
    if (started) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        void load();
      },
      { rootMargin, threshold: 0.01 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [load, node, rootMargin, started]);

  return { ref, data, loading, error, started, reload };
}
