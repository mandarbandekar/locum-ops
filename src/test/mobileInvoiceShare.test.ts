import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Force IndexedDB cache path to no-op so each call exercises the network branch.
vi.stubGlobal("indexedDB", {
  open: () => {
    const req: any = {};
    setTimeout(() => req.onerror && req.onerror(), 0);
    return req;
  },
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { access_token: "tkn" } } }),
    },
  },
}));

import { shareInvoicePdf } from "@/lib/mobileInvoiceShare";

const pdfBlob = () => new Blob(["%PDF-1.4 test"], { type: "application/pdf" });

beforeEach(() => {
  (globalThis as any).fetch = vi.fn(async () => ({
    ok: true,
    blob: async () => pdfBlob(),
  }));
  // jsdom lacks URL.createObjectURL
  (URL as any).createObjectURL = vi.fn(() => "blob:mock");
  (URL as any).revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
  delete (navigator as any).share;
  delete (navigator as any).canShare;
});

describe("shareInvoicePdf", () => {
  it("invokes Web Share API with a PDF file when supported", async () => {
    const shareSpy = vi.fn(async () => undefined);
    (navigator as any).canShare = (data: any) => Array.isArray(data?.files);
    (navigator as any).share = shareSpy;

    const result = await shareInvoicePdf({
      invoiceId: "inv-1",
      invoiceNumber: "INV-0001",
      cacheKey: "v1",
      facilityName: "Greenfield",
    });

    expect(result).toBe("shared");
    expect(shareSpy).toHaveBeenCalledTimes(1);
    const call: any = (shareSpy.mock.calls as any[])[0]?.[0];
    expect(call?.title).toContain("INV-0001");
    expect(call?.files?.[0]?.name).toBe("INV-0001.pdf");
    expect(call?.files?.[0]?.type).toBe("application/pdf");
  });

  it("treats a user-cancelled share (AbortError) as a successful share", async () => {
    (navigator as any).canShare = () => true;
    (navigator as any).share = vi.fn(async () => {
      const err: any = new Error("cancelled");
      err.name = "AbortError";
      throw err;
    });

    const result = await shareInvoicePdf({
      invoiceId: "inv-2",
      invoiceNumber: "INV-0002",
      cacheKey: "v1",
    });

    expect(result).toBe("shared");
  });

  it("falls back to a PDF download when Web Share is unavailable", async () => {
    const clickSpy = vi.fn();
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = origCreate(tag);
      if (tag === "a") (el as any).click = clickSpy;
      return el;
    });

    const result = await shareInvoicePdf({
      invoiceId: "inv-3",
      invoiceNumber: "INV-0003",
      cacheKey: "v1",
    });

    expect(result).toBe("downloaded");
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });
});
