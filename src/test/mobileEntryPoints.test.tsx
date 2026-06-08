import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Stub heavy dialog dependencies so we can observe `open` state without rendering forms.
vi.mock("@/components/AddFacilityDialog", () => ({
  AddFacilityDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="add-clinic-dialog">add-clinic-open</div> : null,
}));
vi.mock("@/components/schedule/ShiftFormDialog", () => ({
  ShiftFormDialog: ({ open, existing }: { open: boolean; existing?: unknown }) =>
    open ? (
      <div data-testid={existing ? "edit-shift-dialog" : "add-shift-dialog"}>
        shift-form-open
      </div>
    ) : null,
}));

// Minimal data + profile + expenses mocks.
const dataMock = {
  facilities: [],
  shifts: [],
  invoices: [],
  lineItems: [],
  terms: [],
  getComputedInvoiceStatus: () => "draft",
  addShift: vi.fn(),
  updateShift: vi.fn(),
  deleteShift: vi.fn(),
};
vi.mock("@/contexts/DataContext", () => ({
  useData: () => dataMock,
}));
vi.mock("@/contexts/UserProfileContext", () => ({
  useUserProfile: () => ({ profile: { timezone: "America/New_York" } }),
}));
vi.mock("@/hooks/useExpenses", () => ({
  useExpenses: () => ({ expenses: [] }),
}));
vi.mock("@/lib/resolveTimezone", () => ({
  resolveShiftTz: () => "America/New_York",
}));
vi.mock("@/lib/tzTime", () => ({
  formatDateInTz: () => "Mon, Jan 1",
  formatTimeInTz: () => "9:00 AM",
}));

import { MobileTodayPage } from "@/pages/mobile/MobileTodayPage";
import { MobileSchedulePage } from "@/pages/mobile/MobileSchedulePage";

function renderTpl(node: React.ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

beforeEach(() => {
  dataMock.shifts = [] as any;
  dataMock.facilities = [] as any;
});

describe("MobileTodayPage entry points", () => {
  it("renders Add clinic and Add shift quick actions", () => {
    renderTpl(<MobileTodayPage />);
    expect(screen.getByRole("button", { name: /add clinic/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add shift/i })).toBeInTheDocument();
  });

  it("opens the Add clinic dialog when tapped", () => {
    renderTpl(<MobileTodayPage />);
    expect(screen.queryByTestId("add-clinic-dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /add clinic/i }));
    expect(screen.getByTestId("add-clinic-dialog")).toBeInTheDocument();
  });

  it("opens the Add shift dialog when tapped", () => {
    renderTpl(<MobileTodayPage />);
    expect(screen.queryByTestId("add-shift-dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /add shift/i }));
    expect(screen.getByTestId("add-shift-dialog")).toBeInTheDocument();
  });
});

describe("MobileSchedulePage entry points", () => {
  it("renders Add shift FAB and opens dialog when pressed", () => {
    renderTpl(<MobileSchedulePage />);
    const fab = screen.getByRole("button", { name: /add shift/i });
    expect(fab).toBeInTheDocument();
    expect(screen.queryByTestId("add-shift-dialog")).toBeNull();
    fireEvent.click(fab);
    expect(screen.getByTestId("add-shift-dialog")).toBeInTheDocument();
  });

  it("opens the edit-shift dialog when the pencil button is tapped", () => {
    dataMock.facilities = [{ id: "f1", name: "Greenfield" } as any] as any;
    dataMock.shifts = [
      {
        id: "s1",
        facility_id: "f1",
        start_datetime: new Date().toISOString(),
        end_datetime: new Date(Date.now() + 3600_000).toISOString(),
      } as any,
    ] as any;
    renderTpl(<MobileSchedulePage />);
    const editBtn = screen.getByRole("button", { name: /edit shift/i });
    fireEvent.click(editBtn);
    expect(screen.getByTestId("edit-shift-dialog")).toBeInTheDocument();
  });
});
