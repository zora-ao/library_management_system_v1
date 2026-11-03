import { describe, expect, it } from "vitest";
import type { Borrow } from "../types/borrow.types";
import {
  classifyBorrowRequests,
  filterBorrowRequests,
  formatRequestDate,
  getBorrowReference,
  getBorrowRequestCounts,
} from "./borrowRequestView";

const makeBorrow = (overrides: Partial<Borrow> = {}): Borrow => ({
  id: "12345678-abcd-4000-8000-123456789abc",
  user_id: "user-1",
  user_name: "Ana Cruz",
  user_email: "ana@example.com",
  book_id: "book-1",
  book_title: "Clean Code",
  book_image: null,
  author: "Robert C. Martin",
  borrowed_at: null,
  due_date: null,
  returned_at: null,
  approved_at: null,
  rejection_reason: null,
  book_available_copies: 2,
  status: "PENDING_BORROW",
  is_overdue: false,
  created_at: "2026-10-20T08:15:00",
  ...overrides,
});

describe("borrow request view model", () => {
  it("classifies and orders each workflow tab", () => {
    const rows = [
      makeBorrow({ id: "pending-new", created_at: "2026-10-20T10:00:00" }),
      makeBorrow({ id: "pending-old", created_at: "2026-10-19T10:00:00" }),
      makeBorrow({ id: "pickup-new", status: "READY_FOR_PICKUP", approved_at: "2026-10-20T11:00:00" }),
      makeBorrow({ id: "pickup-old", status: "READY_FOR_PICKUP", approved_at: "2026-10-20T09:00:00" }),
      makeBorrow({ id: "rejected-new", status: "REJECTED", created_at: "2026-10-20T12:00:00" }),
      makeBorrow({ id: "rejected-old", status: "REJECTED", created_at: "2026-10-18T09:00:00" }),
      makeBorrow({ id: "borrowed", status: "BORROWED", borrowed_at: "2026-10-20T13:00:00" }),
      makeBorrow({ id: "overdue", status: "OVERDUE", borrowed_at: "2026-10-19T13:00:00" }),
      makeBorrow({ id: "pending-return", status: "PENDING_RETURN", borrowed_at: "2026-10-18T13:00:00" }),
      makeBorrow({ id: "returned", status: "RETURNED", returned_at: "2026-10-20T14:00:00" }),
    ];

    expect(classifyBorrowRequests(rows, "pending").map((row) => row.id)).toEqual(["pending-old", "pending-new"]);
    expect(classifyBorrowRequests(rows, "pickup").map((row) => row.id)).toEqual(["pickup-old", "pickup-new"]);
    expect(classifyBorrowRequests(rows, "rejected").map((row) => row.id)).toEqual(["rejected-new", "rejected-old"]);
  });

  it("filters rejected requests by their request creation date", () => {
    const row = makeBorrow({ status: "REJECTED", created_at: "2026-10-20T08:15:00" });

    expect(filterBorrowRequests([row], "", "2026-10-20")).toEqual([row]);
    expect(filterBorrowRequests([row], "", "2026-10-19")).toEqual([]);
  });

  it("searches identity, book metadata, UUID, and stable reference", () => {
    const row = makeBorrow();
    for (const query of ["ana", "example.com", "clean", "martin", "12345678-abcd", getBorrowReference(row)]) {
      expect(filterBorrowRequests([row], query, "all")).toEqual([row]);
    }
    expect(filterBorrowRequests([row], "missing", "all")).toEqual([]);
  });

  it("uses local calendar dates and formats request dates without a time", () => {
    const pickedUp = makeBorrow({ status: "BORROWED", borrowed_at: "2026-10-20T12:00:00" });
    const counts = getBorrowRequestCounts([pickedUp], new Date("2026-10-20T18:00:00"));

    expect(counts.pickedUpToday).toBe(1);
    expect(formatRequestDate("2026-10-20T08:15:00")).not.toMatch(/\d{1,2}:\d{2}/);
    expect(formatRequestDate("2026-10-20T08:15:00")).toContain("2026");
  });

  it("handles missing optional metadata without throwing", () => {
    const row = makeBorrow({ user_name: undefined, user_email: undefined, author: undefined, created_at: undefined });
    expect(filterBorrowRequests([row], "clean", "all")).toEqual([row]);
    expect(formatRequestDate(row.created_at)).toBe("—");
  });
});
