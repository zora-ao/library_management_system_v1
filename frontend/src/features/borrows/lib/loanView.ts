import type { Borrow } from "@/features/borrows/types/borrow.types";
import { containsText } from "@/lib/dsa";

export type LoanWorkspaceMode = "active" | "history";
export type ActiveLoanFilter = "all" | "overdue" | "due-today" | "borrowed";
export type ReturnOutcomeFilter = "all" | "on-time" | "late";
export type LoanSort = "due-asc" | "due-desc" | "returned-desc" | "returned-asc";

const calendarDay = (value: string | Date) => {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export const isSameLocalDay = (value: string | null | undefined, today: Date) =>
  !!value && calendarDay(value).getTime() === calendarDay(today).getTime();

export const dayDifference = (later: string | Date, earlier: string | Date) =>
  Math.round((calendarDay(later).getTime() - calendarDay(earlier).getTime()) / 86_400_000);

export const isActiveLoan = (borrow: Borrow) =>
  borrow.status === "BORROWED" || borrow.status === "PENDING_RETURN" || borrow.status === "OVERDUE";

export const isReturnedLoan = (borrow: Borrow) => borrow.status === "RETURNED" || !!borrow.returned_at;

export const overdueDays = (borrow: Borrow, today: Date) => {
  if (!borrow.due_date || isReturnedLoan(borrow)) return 0;
  return Math.max(0, dayDifference(today, borrow.due_date));
};

export const isLoanOverdue = (borrow: Borrow, today: Date) =>
  borrow.status === "OVERDUE" || overdueDays(borrow, today) > 0;

export const loanReference = (id: string) => {
  const compact = id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const suffix = compact.slice(-3).padStart(3, "0");
  return `LN-${suffix}`;
};

export const formatLoanDate = (value: string | null | undefined, long = false) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", long
    ? { month: "long", day: "2-digit", year: "numeric" }
    : { month: "short", day: "2-digit", year: "numeric" }
  ).format(new Date(value));
};

export const borrowerInitials = (name?: string) => {
  const initials = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return initials || "?";
};

export const activeStatus = (borrow: Borrow, today: Date) => {
  const days = overdueDays(borrow, today);
  if (days > 0) return { label: `${days} ${days === 1 ? "day" : "days"} overdue`, tone: "danger" as const };
  if (isSameLocalDay(borrow.due_date, today)) return { label: "Due today", tone: "warning" as const };
  if (borrow.status === "PENDING_RETURN") return { label: "Return requested", tone: "warning" as const };
  return { label: "Borrowed", tone: "neutral" as const };
};

export const returnOutcome = (borrow: Borrow) => {
  if (!borrow.returned_at || !borrow.due_date) return { label: "On time", tone: "neutral" as const };
  const days = Math.max(0, dayDifference(borrow.returned_at, borrow.due_date));
  return days > 0
    ? { label: `${days} ${days === 1 ? "day" : "days"} late`, tone: "danger" as const }
    : { label: "On time", tone: "neutral" as const };
};

export const matchesLoanSearch = (borrow: Borrow, query: string) => {
  return containsText(
    [borrow.user_name, borrow.user_email, borrow.book_title, borrow.author, borrow.id, loanReference(borrow.id)],
    query,
  );
};
