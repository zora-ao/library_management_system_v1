import { HashMap, Queue, linearSearch, mergeSort } from "@/lib/dsa";
import type { Borrow } from "../types/borrow.types";

export type BorrowRequestTab = "pending" | "pickup" | "rejected";
export type BorrowRequestOrder = "oldest" | "newest";

const timestamp = (value?: string | null) => value ? new Date(value).getTime() : 0;

export const getBorrowReference = (borrow: Borrow) =>
  `REQ-${borrow.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

export const sortBorrowRequests = (
  rows: Borrow[],
  order: BorrowRequestOrder,
  getDate: (borrow: Borrow) => string | null | undefined = (borrow) => borrow.created_at,
) => mergeSort(rows, (a, b) => {
  const delta = timestamp(getDate(a)) - timestamp(getDate(b));
  return order === "oldest" ? delta : -delta;
});

/**
 * Queue of pending borrow requests, first come, first served.
 * Requests are sorted oldest first (merge sort, O(n log n)) and enqueued, so the
 * front of the queue is always the next request a librarian should handle.
 */
export const buildPendingQueue = (rows: Borrow[]): Queue<Borrow> => new Queue(
  sortBorrowRequests(linearSearch(rows, (row) => row.status === "PENDING_BORROW"), "oldest"),
);

/**
 * Each pending request's place in line (1 = next), as a hash map from request ID.
 * Built once in O(n); each table row then finds its position in O(1).
 */
export const getQueuePositions = (queue: Queue<Borrow>): HashMap<number> => {
  const positions = new HashMap<number>();
  queue.toArray().forEach((borrow, index) => positions.set(borrow.id, index + 1));
  return positions;
};

export const classifyBorrowRequests = (rows: Borrow[], tab: BorrowRequestTab) => {
  if (tab === "pending") {
    return buildPendingQueue(rows).toArray();
  }
  if (tab === "pickup") {
    return sortBorrowRequests(
      linearSearch(rows, (row) => row.status === "READY_FOR_PICKUP"),
      "oldest",
      (row) => row.approved_at ?? row.created_at,
    );
  }
  return sortBorrowRequests(linearSearch(rows, (row) => row.status === "REJECTED"), "newest");
};

export const toLocalDateKey = (value?: string | Date | null) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const filterBorrowRequests = (rows: Borrow[], query: string, date: string) => {
  const needle = query.trim().toLowerCase();
  return linearSearch(rows, (row) => {
    const searchable = [
      row.user_name,
      row.user_email,
      row.book_title,
      row.author,
      row.id,
      getBorrowReference(row),
    ].filter(Boolean).join(" ").toLowerCase();
    const matchesQuery = !needle || searchable.includes(needle);
    const matchesDate = date === "all" || toLocalDateKey(row.created_at) === date;
    return matchesQuery && matchesDate;
  });
};

export const formatRequestDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

export const formatRequestTimestamp = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

export const getBorrowRequestCounts = (rows: Borrow[], now = new Date()) => ({
  pending: rows.filter((row) => row.status === "PENDING_BORROW").length,
  forPickup: rows.filter((row) => row.status === "READY_FOR_PICKUP").length,
  pickedUpToday: rows.filter(
    (row) => row.borrowed_at && toLocalDateKey(row.borrowed_at) === toLocalDateKey(now),
  ).length,
});
