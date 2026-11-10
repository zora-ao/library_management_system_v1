import { containsText, linearSearch, mergeSort } from "@/lib/dsa";
import type { Borrow } from "./types/borrow.types";

const zone = "Asia/Manila";
const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" });
const dateFormat = new Intl.DateTimeFormat("en-US", { timeZone: zone, month: "short", day: "2-digit", year: "numeric" });
// API datetimes without an offset are UTC.
function timestamp(value?: string | null): number {
  if (!value) return NaN;
  return new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) || /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : `${value}Z`).getTime();
}
function calendarDay(value: number): number {
  const parts = dayFormat.formatToParts(value);
  const part = (type: string) => Number(parts.find(p => p.type === type)?.value);
  return Date.UTC(part("year"), part("month") - 1, part("day"));
}
export function formatBorrowDate(value?: string | null): string {
  const time = timestamp(value);
  return Number.isFinite(time) ? dateFormat.format(time) : "—";
}
export function borrowState(borrow: Borrow, now = new Date()) {
  if (borrow.status === "RETURNED") return { kind: "returned", label: "Returned" };
  if (borrow.status === "REJECTED") return { kind: "rejected", label: "Request rejected" };
  if (borrow.status === "PENDING_BORROW") return { kind: "pending", label: "Awaiting approval" };
  if (borrow.status === "READY_FOR_PICKUP") return { kind: "ready", label: "Ready for pickup" };
  if (borrow.status === "PENDING_RETURN") return { kind: "pending-return", label: "Awaiting return confirmation" };
  const due = timestamp(borrow.due_date);
  const days = Number.isFinite(due) ? Math.round((calendarDay(due) - calendarDay(now.getTime())) / 86400000) : null;
  if (days !== null && days < 0) return { kind: "overdue", label: `${-days} ${days === -1 ? "day" : "days"} overdue` };
  if (borrow.status === "OVERDUE" || borrow.is_overdue && days === null) return { kind: "overdue", label: "Overdue" };
  if (days !== null && days <= 3) return { kind: "soon", label: days === 0 ? "Due today" : `Due in ${days} ${days === 1 ? "day" : "days"}` };
  return { kind: "borrowed", label: "Borrowed" };
}
export function summarizeBorrows(active: Borrow[], history: Borrow[], now = new Date()) {
  const held = active.filter(b => ["BORROWED", "OVERDUE", "PENDING_RETURN"].includes(b.status));
  return { borrowed: held.length, soon: held.filter(b => borrowState(b, now).kind === "soon").length, overdue: held.filter(b => borrowState(b, now).kind === "overdue").length, returned: history.filter(b => b.status === "RETURNED").length };
}
export interface BorrowFilters { query: string; status: string; period: string; sort: string; history: boolean }
export function filterBorrows(records: Borrow[], options: BorrowFilters, now = new Date()): Borrow[] {
  const query = options.query.trim().toLowerCase();
  const parts = dayFormat.formatToParts(now);
  const year = Number(parts.find(p => p.type === "year")?.value);
  const month = Number(parts.find(p => p.type === "month")?.value);
  const cutoff = options.period === "year" ? Date.UTC(year, 0, 1) : Date.UTC(year, month - (options.period === "quarter" ? 3 : 1), 1);
  const recordDate = (b: Borrow) => timestamp(b.returned_at || b.created_at);
  // Linear search, O(n), then merge sort, O(m log m).
  const matches = linearSearch(records, b => {
    const state = borrowState(b, now);
    return containsText([b.book_title, b.author], query) &&
      (options.history || options.status === "all" || options.status === state.kind || options.status === "borrowed" && ["BORROWED", "OVERDUE"].includes(b.status)) &&
      (!options.history || options.period === "all" || Number.isFinite(recordDate(b)) && calendarDay(recordDate(b)) >= cutoff);
  });
  return mergeSort(matches, (a, b) => {
    if (options.sort === "title") return a.book_title.localeCompare(b.book_title);
    const safe = (value: number, fallback: number) => Number.isFinite(value) ? value : fallback;
    if (options.sort === "borrowed") return safe(timestamp(b.borrowed_at || b.created_at), 0) - safe(timestamp(a.borrowed_at || a.created_at), 0);
    if (options.sort === "returned") return safe(recordDate(b), 0) - safe(recordDate(a), 0);
    return safe(timestamp(a.due_date), Infinity) - safe(timestamp(b.due_date), Infinity);
  });
}
