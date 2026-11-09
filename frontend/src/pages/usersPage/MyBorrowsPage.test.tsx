import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Borrow } from "@/features/borrows/types/borrow.types";
import MyBorrowsPage from "./MyBorrowsPage";

const mocks = vi.hoisted(() => ({ active: [] as Borrow[], history: [] as Borrow[] }));

vi.mock("@/hooks/useBorrows", () => ({
  useBorrows: () => ({ data: mocks.active, isLoading: false, isError: false, refetch: vi.fn() }),
  useBorrowHistory: () => ({ data: mocks.history, isLoading: false, isError: false, refetch: vi.fn() }),
}));

const loan = (overrides: Partial<Borrow>): Borrow => ({
  id: "loan-1",
  user_id: "student-1",
  user_name: "Ana Cruz",
  user_email: "ana@student.edu",
  book_id: "book-1",
  book_title: "Clean Code",
  author: "Robert C. Martin",
  book_image: null,
  book_available_copies: 1,
  borrowed_at: "2026-11-01T02:00:00Z",
  due_date: "2026-11-15T02:00:00Z",
  approved_at: "2026-10-31T02:00:00Z",
  rejection_reason: null,
  returned_at: null,
  status: "BORROWED",
  is_overdue: false,
  created_at: "2026-10-31T02:00:00Z",
  ...overrides,
});

function TabLink() {
  const navigate = useNavigate();
  return <button type="button" onClick={() => navigate("/my-borrows?tab=history")}>Open history via link</button>;
}

const renderPage = (entry = "/my-borrows") => render(
  <MemoryRouter initialEntries={[entry]}>
    <Routes>
      <Route path="/my-borrows" element={<><TabLink /><MyBorrowsPage /></>} />
    </Routes>
  </MemoryRouter>,
);

const openStatusFilter = () => {
  fireEvent.click(screen.getByRole("combobox", { name: "Borrow status" }));
  return screen.getAllByRole("option").map((option) => option.textContent);
};

describe("MyBorrowsPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-11-09T10:00:00+08:00"));
    mocks.active = [
      loan({ id: "loan-1", book_title: "Clean Code", due_date: "2026-11-20T02:00:00Z" }),
      loan({ id: "loan-2", book_id: "book-2", book_title: "Refactoring", due_date: "2026-11-05T02:00:00Z", status: "OVERDUE", is_overdue: true }),
    ];
    mocks.history = [
      loan({ id: "loan-3", book_id: "book-3", book_title: "The Alchemist", status: "RETURNED", returned_at: "2026-11-02T02:00:00Z" }),
    ];
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("summarizes current loans and lists active borrows", () => {
    renderPage();

    expect(within(screen.getByRole("region", { name: "Currently borrowed" })).getByText("02")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Overdue" })).getByText("01")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Returned" })).getByText("01")).toBeInTheDocument();
    expect(screen.getByText("Clean Code", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("4 days overdue")).toBeInTheDocument();
  });

  it("never offers a return-request filter because returns happen at the desk", () => {
    mocks.active = [...mocks.active, loan({ id: "loan-4", book_id: "book-4", book_title: "Sapiens", status: "PENDING_BORROW", borrowed_at: null, due_date: null })];
    renderPage();

    const options = openStatusFilter();

    expect(options).toContain("Awaiting approval");
    expect(options).not.toContain("Awaiting return confirmation");
  });

  it("hides request-stage filters when no request is in progress", () => {
    renderPage();

    expect(openStatusFilter()).toEqual(["All statuses", "Borrowed", "Due soon", "Overdue"]);
  });

  it("resets the search when the tab changes through the URL", () => {
    renderPage();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search your borrowed books" }), { target: { value: "Clean" } });
    expect(screen.queryByText("Refactoring", { selector: "strong" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open history via link" }));

    expect(screen.getByRole("searchbox", { name: "Search your borrowing history" })).toHaveValue("");
    expect(screen.getByText("The Alchemist", { selector: "strong" })).toBeInTheDocument();
  });
});
