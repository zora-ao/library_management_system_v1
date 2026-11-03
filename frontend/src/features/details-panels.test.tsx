import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import BookDetailsDialog from "@/features/books/components/books/BookDetailsDialog";
import type { Book } from "@/features/books/types/book.types";
import BorrowRequestDetailsSheet from "@/features/borrows/components/BorrowRequestDetailsSheet";
import LoanDetailsDialog from "@/features/borrows/components/LoanDetailsDialog";
import type { Borrow } from "@/features/borrows/types/borrow.types";

const borrow: Borrow = {
  id: "borrow-1",
  user_id: "user-1",
  user_name: "Bianca Student",
  user_email: "bianca@example.com",
  book_id: "book-1",
  book_title: "The Midnight Library",
  book_image: null,
  author: "Matt Hai g",
  book_available_copies: 2,
  borrowed_at: "2026-10-01T00:00:00Z",
  due_date: "2026-10-15T00:00:00Z",
  approved_at: "2026-09-30T00:00:00Z",
  rejection_reason: null,
  returned_at: null,
  status: "BORROWED",
  is_overdue: false,
  created_at: "2026-09-29T00:00:00Z",
};

const book: Book = {
  id: "book-1",
  title: "The Midnight Library",
  author: "Matt Haig",
  category_id: "category-1",
  category_name: "Fiction",
  total_copies: 4,
  available_copies: 2,
  image_url: null,
  pages: 304,
  created_at: "2026-09-01T00:00:00Z",
};

describe("staff detail panels", () => {
  afterEach(cleanup);

  it("uses theme-aware surfaces and responsive type in the borrow request drawer", () => {
    render(<BorrowRequestDetailsSheet borrow={{ ...borrow, status: "PENDING_BORROW", borrowed_at: null }} open processing={false} onOpenChange={vi.fn()} onApprove={vi.fn()} onReject={vi.fn()} />);

    const panel = screen.getByRole("dialog");
    expect(panel).toHaveClass("!bg-popover", "!text-popover-foreground", "!backdrop-blur-none");
    expect(panel).not.toHaveClass("!bg-black", "!text-white");
    expect(screen.getByText("Student").closest("section")).toHaveClass("bg-muted");
    expect(screen.getByText("Student").closest("section")).not.toHaveClass("bg-muted/40");
    expect(screen.getByRole("heading", { name: "Borrow request details" })).toHaveClass("text-xl", "sm:text-2xl");
    expect(screen.getByText("Student")).toHaveClass("text-sm", "sm:text-base");
  });

  it("uses theme-aware surfaces and readable type in the book details panel", () => {
    render(<BookDetailsDialog book={book} borrows={[]} circulationAvailable open onOpenChange={vi.fn()} onEdit={vi.fn()} onArchive={vi.fn()} />);

    const panel = screen.getByRole("dialog", { name: "Book details" });
    const header = screen.getByRole("heading", { name: "Book details" }).closest('[data-slot="sheet-header"]');
    expect(panel).toHaveAttribute("data-slot", "sheet-content");
    expect(panel).toHaveClass("!bg-popover", "!text-popover-foreground", "!backdrop-blur-none", "w-full", "sm:max-w-[480px]");
    expect(panel).not.toHaveClass("!bg-black", "!text-white");
    expect(header).toHaveClass("border-b", "border-border", "px-6", "py-5");
    expect(header).not.toHaveClass("bg-muted");
    expect(screen.getByText("Total copies").parentElement).toHaveClass("bg-muted");
    expect(screen.getByText("Total copies").parentElement).not.toHaveClass("bg-muted/40");
    expect(screen.getByText("Total copies")).toHaveClass("text-sm", "sm:text-base");
  });

  it("uses theme-aware surfaces and readable type in the loan details panel", () => {
    render(<LoanDetailsDialog borrow={borrow} open today={new Date("2026-10-10T00:00:00Z")} onOpenChange={vi.fn()} onRecordReturn={vi.fn()} />);

    const panel = screen.getByRole("dialog");
    expect(panel).toHaveClass("bg-popover", "text-popover-foreground");
    expect(panel).not.toHaveClass("bg-black", "text-white");
    expect(screen.getByText("Book picked up")).toHaveClass("text-sm", "sm:text-base");
    expect(screen.getByRole("button", { name: "Record return" })).toHaveClass("text-sm", "sm:text-base");
  });
});
