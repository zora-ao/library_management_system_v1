import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import AdminDashboardPage from "./AdminDashboardPage";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { username: "Library Staff", role: "librarian" } }),
  useGetAllUsers: () => ({ data: [], isLoading: false }),
}));
vi.mock("@/hooks/useBorrows", () => ({
  useAdminBorrows: () => ({ data: [{ id: "borrow-1", status: "READY_FOR_PICKUP", user_name: "Ana Cruz", book_title: "Clean Code", created_at: "2026-10-24T08:00:00Z", due_date: null, borrowed_at: null, returned_at: null, approved_at: "2026-10-24T09:00:00Z" }], isLoading: false }),
}));
vi.mock("@/hooks/useBooks", () => ({
  useBooks: () => ({ data: [], isLoading: false }),
}));
vi.mock("@/hooks/useCategories", () => ({
  useCategories: () => ({ data: [], isLoading: false }),
}));

describe("AdminDashboardPage card surfaces", () => {
  afterEach(cleanup);

  it("uses theme-aware styling for dashboard cards shared by staff roles", () => {
    render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>);

    const featured = screen.getByText("Pending requests").closest("article");
    const standard = screen.getByText("Waiting for pickup").closest("article");
    const overview = screen.getByText("Library overview").closest("section");

    expect(featured).toHaveClass("bg-primary/90", "border-primary/40", "text-primary-foreground");
    expect(standard).toHaveClass("bg-card", "border-border/70", "shadow-[var(--glass-shadow)]");
    expect(overview).toHaveClass("bg-card", "border-border/70", "shadow-[var(--glass-shadow)]");
  });

  it("scales supporting dashboard typography across screen sizes", () => {
    render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>);

    expect(screen.getByText("Overview").parentElement).toHaveClass("text-sm", "sm:text-base");
    expect(screen.queryByText("Workspace / Overview")).not.toBeInTheDocument();
    expect(screen.getByText(/Good (morning|afternoon|evening), Library\./)).toHaveClass("text-3xl", "sm:text-4xl");
    expect(screen.getByText("Waiting for pickup")).toHaveClass("text-sm", "sm:text-base");
    expect(screen.getByText("Approved and ready")).toHaveClass("text-sm", "sm:text-base");
    expect(screen.getByText("Student / Book").parentElement).toHaveClass("text-sm", "sm:text-base");
    expect(screen.getByRole("link", { name: /Review requests/ })).toHaveClass("text-sm", "sm:text-base");
    expect(screen.getByText("Loans", { selector: "span" }).parentElement).toHaveClass("text-sm", "sm:text-base");
    expect(screen.getByText("Library overview")).toHaveClass("text-sm", "sm:text-base");
  });

  it("uses the full content width and the same vertical spacing as other admin pages", () => {
    const { container } = render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>);

    expect(container.firstElementChild).toHaveClass("w-full", "space-y-7", "pb-10");
    expect(container.firstElementChild).not.toHaveClass("max-w-[1144px]");
  });

  it("keeps attention actions on one line and lets the action column grow", () => {
    render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>);

    const action = screen.getByRole("link", { name: /Confirm pickup/ });
    const row = action.parentElement;
    const header = screen.getByText("Student / Book").parentElement;

    expect(action).toHaveClass("inline-flex", "whitespace-nowrap");
    expect(row).toHaveClass("grid-cols-[minmax(210px,2fr)_minmax(120px,1fr)_minmax(82px,auto)_minmax(140px,auto)]");
    expect(header).toHaveClass("grid-cols-[minmax(210px,2fr)_minmax(120px,1fr)_minmax(82px,auto)_minmax(140px,auto)]");
  });

  it("renders seven days of loans and returns in an interactive accessible chart", () => {
    render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>);

    expect(screen.getByRole("img", { name: "Loans and returns over the last 7 days" })).toBeInTheDocument();
    const activityTable = screen.getByRole("table", { name: "Borrowing activity data" });
    expect(within(activityTable).getAllByRole("row")).toHaveLength(8);
  });
});
