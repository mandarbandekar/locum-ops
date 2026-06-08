import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <MobileBottomNav />
    </MemoryRouter>
  );
}

describe("MobileBottomNav", () => {
  it("renders all 5 primary tabs with correct hrefs", () => {
    renderAt("/");
    const expected: Array<[string, string]> = [
      ["Today", "/"],
      ["Schedule", "/schedule"],
      ["Clinics", "/facilities"],
      ["Money", "/invoices"],
      ["Insights", "/business"],
    ];
    for (const [label, href] of expected) {
      const link = screen.getByRole("link", { name: new RegExp(label, "i") });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", href);
    }
  });

  it("marks Today active on /", () => {
    renderAt("/");
    expect(screen.getByRole("link", { name: /today/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /schedule/i })).not.toHaveAttribute("aria-current");
  });

  it("marks Schedule active on /schedule and nested routes", () => {
    renderAt("/schedule/anything");
    expect(screen.getByRole("link", { name: /schedule/i })).toHaveAttribute("aria-current", "page");
  });

  it("marks Money active on /invoices and /expenses", () => {
    renderAt("/expenses");
    expect(screen.getByRole("link", { name: /money/i })).toHaveAttribute("aria-current", "page");
  });

  it("marks Clinics active on /facilities/:id", () => {
    renderAt("/facilities/abc");
    expect(screen.getByRole("link", { name: /clinics/i })).toHaveAttribute("aria-current", "page");
  });

  it("marks Insights active on /business", () => {
    renderAt("/business");
    expect(screen.getByRole("link", { name: /insights/i })).toHaveAttribute("aria-current", "page");
  });
});
