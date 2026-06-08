/**
 * Service-worker registration wrapper.
 *
 * The PWA skill requires that we register ONLY from this single guarded
 * module, and never inside Lovable preview/dev contexts. The plugin is
 * configured with `injectRegister: null` so this is the only registrar.
 */

const SW_URL = "/sw.js";

function shouldSkipRegistration(): boolean {
  if (!import.meta.env.PROD) return true;
  if (typeof window === "undefined") return true;

  // Inside an iframe (Lovable preview frame).
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }

  // Explicit kill switch
  if (window.location.search.includes("sw=off")) return true;

  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return true;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return true;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return true;

  return false;
}

async function unregisterMatching() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => {
          const scriptUrl = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
          return scriptUrl.endsWith(SW_URL);
        })
        .map((r) => r.unregister()),
    );
  } catch {
    /* noop */
  }
}

export function registerServiceWorker() {
  if (shouldSkipRegistration()) {
    void unregisterMatching();
    return;
  }
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register(SW_URL, { scope: "/" }).catch(() => {
      /* fail silently — offline is best-effort */
    });
  });
}
