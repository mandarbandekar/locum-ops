import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Polls the deployed index.html for changes (ETag / Last-Modified / content hash)
 * and prompts a one-tap refresh when a new build is detected. Designed for the
 * mobile web shell so users always get the latest version without manually
 * reloading. Skipped in Vite dev to avoid conflicting with HMR.
 */
export function useAutoRefreshOnDeploy(intervalMs = 60_000) {
  const fingerprintRef = useRef<string | null>(null);
  const promptedRef = useRef(false);

  useEffect(() => {
    if (import.meta.env.DEV) return;
    if (typeof window === "undefined") return;

    let cancelled = false;
    let timer: number | undefined;

    async function fetchFingerprint(): Promise<string | null> {
      try {
        const res = await fetch(`/index.html?_=${Date.now()}`, {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!res.ok) return null;
        const etag = res.headers.get("etag");
        const lastMod = res.headers.get("last-modified");
        if (etag || lastMod) return `${etag ?? ""}|${lastMod ?? ""}`;
        // Fall back to hashing the body so we still detect changes
        const text = await res.text();
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
          hash = (hash * 31 + text.charCodeAt(i)) | 0;
        }
        return `body:${hash}`;
      } catch {
        return null;
      }
    }

    function promptRefresh() {
      if (promptedRef.current) return;
      promptedRef.current = true;
      toast("A new version is available", {
        description: "Refresh to get the latest updates.",
        duration: Infinity,
        action: {
          label: "Refresh",
          onClick: () => window.location.reload(),
        },
      });
    }

    async function check() {
      const current = await fetchFingerprint();
      if (cancelled || !current) return;
      if (fingerprintRef.current == null) {
        fingerprintRef.current = current;
        return;
      }
      if (current !== fingerprintRef.current) {
        promptRefresh();
      }
    }

    // Initial fingerprint, then poll
    check();
    timer = window.setInterval(check, intervalMs);

    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [intervalMs]);
}
