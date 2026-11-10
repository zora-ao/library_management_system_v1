import type { Borrow } from "@/features/borrows/types/borrow.types";
import { containsText, groupBy, linearSearch, mergeSort, type HashMap } from "@/lib/dsa";
import type { User, UserRole } from "../types/auth.types";

export type UserRoleFilter = "all" | UserRole;
export type UserStatusFilter = "all" | "active" | "inactive";
export type UserSort = "newest" | "oldest" | "name";

interface UserFilters {
  search: string;
  role: UserRoleFilter;
  status: UserStatusFilter;
  sort: UserSort;
}

const activeLoanStatuses = new Set<Borrow["status"]>([
  "READY_FOR_PICKUP",
  "BORROWED",
  "PENDING_RETURN",
  "OVERDUE",
]);

export function getUserSummary(users: User[]) {
  return {
    totalUsers: users.length,
    students: users.filter((user) => user.role === "student").length,
    staffAccounts: users.filter((user) => user.role === "librarian" || user.role === "admin").length,
    inactiveAccounts: users.filter((user) => !user.is_active).length,
  };
}

export function getActiveLoansForUser(userId: string, borrows: Borrow[]) {
  return borrows.filter(
    (borrow) => String(borrow.user_id) === String(userId) && activeLoanStatuses.has(borrow.status),
  );
}

/**
 * Hash map from user ID to that user's active loans, built in one pass.
 * Building it is O(b) for b borrows; each table row then looks up its loans in
 * O(1) on average, instead of scanning every borrow again (O(users x b)).
 */
export function indexActiveLoansByUser(borrows: Borrow[]): HashMap<Borrow[]> {
  return groupBy(
    linearSearch(borrows, (borrow) => activeLoanStatuses.has(borrow.status)),
    (borrow) => String(borrow.user_id),
  );
}

export function filterAndSortUsers(users: User[], filters: UserFilters) {
  // One linear search (O(n)) checks the search text, role and status together.
  const matches = linearSearch(users, (user) => {
    if (!containsText([user.username, user.email], filters.search)) return false;
    if (filters.role !== "all" && user.role !== filters.role) return false;
    if (filters.status === "all") return true;
    return filters.status === "active" ? Boolean(user.is_active) : !user.is_active;
  });
  return mergeSort(matches, (left, right) => {
      if (filters.sort === "name") return left.username.localeCompare(right.username);
      const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
      const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
      return filters.sort === "oldest" ? leftTime - rightTime : rightTime - leftTime;
    });
}
