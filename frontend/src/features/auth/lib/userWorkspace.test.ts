import { describe, expect, it } from "vitest";
import type { Borrow } from "@/features/borrows/types/borrow.types";
import type { User } from "../types/auth.types";
import { filterAndSortUsers, getActiveLoansForUser, getUserSummary, indexActiveLoansByUser } from "./userWorkspace";

const users: User[] = [
  { id: "admin-1", username: "Alex Admin", email: "alex@library.test", avatar_url: "", role: "admin", is_active: true, created_at: "2026-10-20T08:00:00Z" },
  { id: "student-1", username: "Bianca Student", email: "bianca@library.test", avatar_url: "", role: "student", is_active: true, created_at: "2026-10-19T08:00:00Z" },
  { id: "librarian-1", username: "Carlo Librarian", email: "carlo@library.test", avatar_url: "", role: "librarian", is_active: false, created_at: "2026-10-18T08:00:00Z" },
];

const borrow = (overrides: Partial<Borrow>): Borrow => ({
  id: "borrow-1", user_id: "student-1", book_id: "book-1", book_title: "The Midnight Library",
  book_available_copies: 1, borrowed_at: "2026-10-01T08:00:00Z", due_date: "2026-10-15T08:00:00Z",
  approved_at: "2026-10-01T08:00:00Z", rejection_reason: null, returned_at: null,
  status: "BORROWED", is_overdue: false, ...overrides,
});

describe("user workspace data", () => {
  it("summarizes all accounts, including the signed-in admin", () => {
    expect(getUserSummary(users)).toEqual({ totalUsers: 3, students: 1, staffAccounts: 2, inactiveAccounts: 1 });
  });

  it("filters by search, role, and status and sorts oldest first", () => {
    expect(filterAndSortUsers(users, { search: "carlo", role: "librarian", status: "inactive", sort: "oldest" }).map((user) => user.id)).toEqual(["librarian-1"]);
  });

  it("sorts newest accounts first by default", () => {
    expect(filterAndSortUsers(users, { search: "", role: "all", status: "all", sort: "newest" }).map((user) => user.id)).toEqual(["admin-1", "student-1", "librarian-1"]);
  });

  it("returns only active loans and detects overdue records", () => {
    const loans = [
      borrow({ id: "active" }), borrow({ id: "overdue", status: "OVERDUE", is_overdue: true }),
      borrow({ id: "pending-return", status: "PENDING_RETURN" }),
      borrow({ id: "returned", status: "RETURNED", returned_at: "2026-10-10T08:00:00Z" }),
    ];
    expect(getActiveLoansForUser("student-1", loans).map((item) => item.id)).toEqual(["active", "overdue", "pending-return"]);
    expect(getActiveLoansForUser("student-1", loans).filter((item) => item.is_overdue)).toHaveLength(1);
  });

  it("indexes active loans by user in a hash map, matching the per-user scan", () => {
    const loans = [
      borrow({ id: "s1-active" }),
      borrow({ id: "s1-returned", status: "RETURNED" }),
      borrow({ id: "s2-overdue", user_id: "student-2", status: "OVERDUE", is_overdue: true }),
      borrow({ id: "s2-pickup", user_id: "student-2", status: "READY_FOR_PICKUP" }),
    ];
    const index = indexActiveLoansByUser(loans);

    for (const userId of ["student-1", "student-2"]) {
      expect(index.get(userId)?.map((loan) => loan.id)).toEqual(getActiveLoansForUser(userId, loans).map((loan) => loan.id));
    }
    expect(index.get("no-loans")).toBeUndefined();
    expect(indexActiveLoansByUser([]).size).toBe(0);
  });
});
