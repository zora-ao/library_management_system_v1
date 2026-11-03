import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Borrow } from "@/features/borrows/types/borrow.types";
import AdminBorrowsPage from "./AdminBorrowsPage";

const mocks = vi.hoisted(() => ({ confirmReturn: vi.fn() }));

const borrows: Borrow[] = [
  {
    id: "00000000-0000-0000-0000-000000000014",
    user_id: "student-1",
    user_name: "Maria Santos",
    user_email: "maria.santos@student.edu",
    book_id: "book-1",
    book_title: "Clean Code",
    author: "Robert C. Martin, Martin Fowler",
    book_image: null,
    book_available_copies: 0,
    borrowed_at: "2026-10-04T08:00:00Z",
    due_date: "2026-10-18T08:00:00Z",
    approved_at: "2026-10-03T08:00:00Z",
    rejection_reason: null,
    returned_at: null,
    status: "BORROWED",
    is_overdue: true,
    created_at: "2026-10-03T08:00:00Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000015",
    user_id: "student-2",
    user_name: "Bea Cruz",
    user_email: "bea.cruz@student.edu",
    book_id: "book-2",
    book_title: "The Alchemist",
    author: "Paulo Coelho",
    book_image: null,
    book_available_copies: 0,
    borrowed_at: "2026-10-06T08:00:00Z",
    due_date: "2026-10-20T08:00:00Z",
    approved_at: "2026-10-05T08:00:00Z",
    rejection_reason: null,
    returned_at: null,
    status: "PENDING_RETURN",
    is_overdue: false,
    created_at: "2026-10-05T08:00:00Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000010",
    user_id: "student-3",
    user_name: "Juan Delacruz",
    user_email: "juan.delacruz@student.edu",
    book_id: "book-3",
    book_title: "Atomic Habits",
    author: "James Clear",
    book_image: null,
    book_available_copies: 1,
    borrowed_at: "2026-10-06T08:00:00Z",
    due_date: "2026-10-20T08:00:00Z",
    approved_at: "2026-10-05T08:00:00Z",
    rejection_reason: null,
    returned_at: "2026-10-20T09:00:00Z",
    status: "RETURNED",
    is_overdue: false,
    created_at: "2026-10-05T08:00:00Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000099",
    user_id: "student-4",
    user_name: "Ignored Request",
    user_email: "ignored@student.edu",
    book_id: "book-4",
    book_title: "Pending Book",
    author: "Pending Author",
    book_image: null,
    book_available_copies: 1,
    borrowed_at: null,
    due_date: null,
    approved_at: null,
    rejection_reason: null,
    returned_at: null,
    status: "PENDING_BORROW",
    is_overdue: false,
    created_at: "2026-10-20T07:00:00Z",
  },
];

vi.mock("@/hooks/useBorrows", () => ({
  useAdminBorrows: () => ({ data: borrows, isLoading: false, isError: false, error: null }),
  useApproveReturn: () => ({
    mutate: mocks.confirmReturn,
    isPending: false,
    variables: null,
  }),
}));

const renderPage = () => render(
  <MemoryRouter initialEntries={["/all-borrows/active"]}>
    <Routes>
      <Route path="/all-borrows/:status" element={<AdminBorrowsPage />} />
    </Routes>
  </MemoryRouter>,
);

describe("AdminBorrowsPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-10-20T12:00:00+08:00"));
    mocks.confirmReturn.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows live loan summary counts and keeps borrow requests out of the workspace", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Loans & Returns" })).toBeInTheDocument();
    expect(screen.getByText("Loans & Returns", { selector: "p" })).toBeInTheDocument();
    expect(screen.queryByText("Workspace / Loans & Returns")).not.toBeInTheDocument();
    expect(screen.getByTestId("active-loans-count")).toHaveTextContent("02");
    expect(screen.getByTestId("overdue-count")).toHaveTextContent("01");
    expect(screen.getByTestId("due-today-count")).toHaveTextContent("01");
    expect(screen.getByTestId("returned-today-count")).toHaveTextContent("01");
    expect(screen.queryByText("Ignored Request")).not.toBeInTheDocument();
  });

  it("removes Return requested from the active status filter while preserving pending-return loans", () => {
    renderPage();

    const statusFilter = screen.getByRole("combobox", { name: "Loan status" });
    expect(within(statusFilter).getAllByRole("option").map((option) => option.textContent)).toEqual([
      "All active loans",
      "Overdue",
      "Due today",
      "Borrowed",
    ]);
    expect(screen.getByText("Bea Cruz")).toBeInTheDocument();
  });

  it("switches to return history and filters it by student or book", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();

    await user.click(screen.getByRole("button", { name: /Return History/i }));
    expect(screen.getByText("Juan Delacruz")).toBeInTheDocument();
    expect(screen.queryByText("Maria Santos")).not.toBeInTheDocument();

    await user.type(screen.getByRole("searchbox"), "Atomic");
    expect(screen.getByText("Atomic Habits")).toBeInTheDocument();

    await user.clear(screen.getByRole("searchbox"));
    await user.type(screen.getByRole("searchbox"), "No match");
    expect(screen.getByText("No loan records found")).toBeInTheDocument();
  });

  it("opens loan details and confirms a physical return", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();

    const mariaRow = screen.getByText("Maria Santos").closest("tr");
    expect(mariaRow).not.toBeNull();
    await user.click(within(mariaRow!).getByRole("button", { name: "View details" }));
    expect(screen.getByRole("dialog", { name: "Loan details" })).toHaveTextContent("LN-014");

    await user.click(screen.getByRole("button", { name: "Record return" }));
    const returnDialog = screen.getByRole("dialog", { name: "Record book return" });
    expect(returnDialog).toHaveTextContent("October 20, 2026");
    expect(returnDialog).toHaveClass("bg-popover", "text-popover-foreground", "sm:max-w-md");
    expect(screen.getByRole("heading", { name: "Record book return" })).toHaveClass("text-xl", "sm:text-2xl", "text-foreground");

    await user.click(screen.getByRole("button", { name: "Confirm return" }));
    expect(mocks.confirmReturn).toHaveBeenCalledWith("00000000-0000-0000-0000-000000000014");
  });

  it("uses theme-aware cards, controls, table rows, and pagination", () => {
    renderPage();

    expect(screen.getByText("Active loans").closest("article")).toHaveClass("border-primary/40", "bg-primary/90", "text-primary-foreground");
    expect(screen.getByText("Needs your attention").closest("article")).toHaveClass("border-border/70", "bg-card", "shadow-[var(--glass-shadow)]");
    expect(screen.getByRole("searchbox")).toHaveClass("bg-control");
    expect(screen.getByRole("columnheader", { name: "Student" }).closest("tr")).toHaveClass("border-border", "bg-muted/60");
    expect(screen.getByText("Maria Santos").closest("tr")).toHaveClass("border-border/60", "bg-card/30");
    expect(screen.getByRole("button", { name: "Previous" })).toHaveClass("border-border", "bg-background");
  });

  it("matches the borrow request workspace spacing and flexible table format", () => {
    renderPage();

    const page = screen.getByRole("heading", { name: "Loans & Returns" }).closest("header")?.parentElement;
    const summaryCard = screen.getByText("Active loans").closest("article");
    const workspace = screen.getByRole("searchbox").closest("section");
    const filterBar = screen.getByRole("searchbox").closest("div");
    const table = screen.getByRole("table");
    const pagination = screen.getByText(/Showing 1.+2 of 2 active loans/).parentElement;

    expect(page).toHaveClass("w-full", "space-y-7", "pb-10");
    expect(page).not.toHaveClass("mx-auto", "max-w-[1180px]");
    expect(summaryCard).toHaveClass("w-full", "rounded-3xl");
    expect(workspace).toHaveClass("overflow-hidden", "rounded-3xl", "border-border/70", "bg-card");
    expect(filterBar).toHaveClass("border-b", "border-border", "p-5");
    expect(table).toHaveClass("w-full", "table-fixed", "text-sm", "sm:text-base");
    expect(pagination).toHaveClass("border-t", "border-border/60", "px-5", "py-4");
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
  });

  it("formats multiple authors to keep the book column compact", () => {
    renderPage();

    expect(screen.getByText("Robert C. Martin et al.")).toHaveAttribute(
      "title",
      "Robert C. Martin, Martin Fowler",
    );
    expect(screen.queryByText("Robert C. Martin, Martin Fowler")).not.toBeInTheDocument();
  });

  it("scales workspace, card, filter, and table typography", () => {
    renderPage();
    const mariaRow = screen.getByText("Maria Santos").closest("tr");
    expect(mariaRow).not.toBeNull();

    const eyebrow = screen.getByText("Loans & Returns", { selector: "p" });
    expect(eyebrow).toHaveClass("text-muted-foreground", "uppercase", "tracking-[0.16em]");
    expect(eyebrow).not.toHaveClass("booky-eyebrow", "text-leather");
    expect(screen.getByRole("heading", { name: "Loans & Returns" })).toHaveClass("text-2xl", "sm:text-3xl");
    expect(screen.getByText("Track borrowed books, follow up on due dates, and record returns.")).toHaveClass("text-sm", "sm:text-base");
    expect(screen.getByText("Active loans")).toHaveClass("text-xs", "sm:text-sm");
    expect(screen.getByText("Includes overdue books")).toHaveClass("text-xs", "sm:text-sm");
    expect(screen.getByRole("button", { name: /Active Loans/ })).toHaveClass("text-xs", "sm:text-sm");
    expect(screen.getByRole("searchbox")).toHaveClass("text-sm", "sm:text-base");
    expect(screen.getByRole("columnheader", { name: "Student" })).toHaveClass("text-foreground");
    expect(screen.getByRole("columnheader", { name: "Student" })).not.toHaveClass("text-xs", "font-bold", "sm:text-sm");
    expect(within(mariaRow!).getByText("Maria Santos")).toHaveClass("text-xs", "sm:text-sm");
    expect(within(mariaRow!).getByText("maria.santos@student.edu")).toHaveClass("text-xs", "sm:text-sm");
    const viewDetails = within(mariaRow!).getByRole("button", { name: "View details" });
    expect(viewDetails).toHaveClass("text-xs", "sm:text-sm");
    expect(viewDetails.parentElement).toHaveClass("flex-row", "justify-center");
  });
});
