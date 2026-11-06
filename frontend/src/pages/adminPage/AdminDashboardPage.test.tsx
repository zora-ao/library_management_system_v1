import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DashboardSummary } from "@/features/dashboard/types";

import AdminDashboardPage from "./AdminDashboardPage";

const roleState = vi.hoisted(() => ({ role: "librarian" }));
const dashboardData = vi.hoisted((): DashboardSummary => ({
  total_users: undefined as number | undefined,
  book_titles: 6,
  total_copies: 14,
  available_copies: 9,
  categories: 3,
  pending: 2,
  waiting_for_pickup: 1,
  active: 4,
  overdue: 1,
  returned: 8,
  returned_today: 1,
  attention: [{ id: "borrow-1", user_id: "user-1", status: "READY_FOR_PICKUP", user_name: "Ana Cruz", book_id: "book-1", book_title: "Clean Code", book_available_copies: 1, created_at: "2026-10-24T08:00:00Z", due_date: null, borrowed_at: null, returned_at: null, approved_at: "2026-10-24T09:00:00Z", rejection_reason: null, is_overdue: false }],
  recent: [{ id: "borrow-1", user_id: "user-1", status: "READY_FOR_PICKUP", user_name: "Ana Cruz", book_id: "book-1", book_title: "Clean Code", book_available_copies: 1, created_at: "2026-10-24T08:00:00Z", due_date: null, borrowed_at: null, returned_at: null, approved_at: "2026-10-24T09:00:00Z", rejection_reason: null, is_overdue: false }],
  activity: [
    { date: "2026-10-31", loans: 0, returns: 0 },
    { date: "2026-11-01", loans: 1, returns: 0 },
    { date: "2026-11-02", loans: 0, returns: 1 },
    { date: "2026-11-03", loans: 2, returns: 0 },
    { date: "2026-11-04", loans: 0, returns: 0 },
    { date: "2026-11-05", loans: 1, returns: 1 },
    { date: "2026-11-06", loans: 0, returns: 1 },
  ],
}));
const dashboardQuery = vi.hoisted(() => ({
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
  data: dashboardData as DashboardSummary | undefined,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { username: "Library Staff", role: roleState.role } }),
}));
vi.mock("@/hooks/useDashboard", () => ({ useDashboard: () => dashboardQuery }));

describe("AdminDashboardPage card surfaces", () => {
  afterEach(() => {
    cleanup();
    roleState.role = "librarian";
    dashboardQuery.isLoading = false;
    dashboardQuery.isError = false;
    dashboardQuery.data = dashboardData;
    dashboardData.total_users = undefined;
  });

  it("renders the compact dashboard response instead of full collection data", () => {
    render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>);

    expect(screen.getByText("Pending requests").closest("article")).toHaveTextContent("02");
    expect(screen.getByText("Waiting for pickup").closest("article")).toHaveTextContent("01");
    expect(screen.getByText("Book titles").previousElementSibling).toHaveTextContent("6");
    expect(screen.getByText("Available copies").previousElementSibling).toHaveTextContent("9");
    expect(screen.getByText("Categories").previousElementSibling).toHaveTextContent("3");
  });

  it("shows the administrator-only user total when supplied", () => {
    roleState.role = "admin";
    dashboardData.total_users = 12;

    render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>);

    expect(screen.getByText("Total users").previousElementSibling).toHaveTextContent("12");
  });

  it("shows a single dashboard loading state", () => {
    dashboardQuery.isLoading = true;

    render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>);

    expect(screen.getByRole("status", { name: "Loading dashboard" })).toBeInTheDocument();
  });

  it("shows a retryable error instead of loading forever when the request fails", () => {
    dashboardQuery.isError = true;
    dashboardQuery.data = undefined;

    render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>);

    expect(screen.getByRole("alert")).toHaveTextContent("We couldn’t load the dashboard.");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

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
