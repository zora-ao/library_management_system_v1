import type { Borrow } from "@/features/borrows/types/borrow.types";
import { linearSearch, mergeSort } from "@/lib/dsa";
import type { Book } from "../types/book.types";

export type BookAvailability = "all" | "available" | "unavailable";
export type BookSort = "recent" | "title" | "availability" | "archived";

export interface BookListFilters {
  search?: string;
  category?: string;
  availability?: BookAvailability;
  archiveDate?: string;
  sort?: BookSort;
}

export const getBookSummary = (books: Book[]) => ({
  totalTitles: books.length,
  totalCopies: books.reduce((sum, book) => sum + (book.total_copies || 0), 0),
  availableCopies: books.reduce((sum, book) => sum + (book.available_copies || 0), 0),
  unavailableTitles: books.filter((book) => (book.available_copies || 0) === 0).length,
});

const toLocalDateKey = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const filterAndSortBooks = (books: Book[], filters: BookListFilters) => {
  const search = filters.search?.trim().toLocaleLowerCase() || "";
  // Linear search (O(n)) applies the search text and every filter in one pass.
  const filtered = linearSearch(books, (book) => {
    const haystack = [book.title, book.author, book.isbn, book.category_name]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();
    if (search && !haystack.includes(search)) return false;
    if (filters.category && filters.category !== "all" && book.category_id !== filters.category) return false;
    if (filters.availability === "available" && book.available_copies <= 0) return false;
    if (filters.availability === "unavailable" && book.available_copies > 0) return false;
    if (filters.archiveDate && toLocalDateKey(book.archived_at) !== filters.archiveDate) return false;
    return true;
  });

  // Merge sort (O(m log m)) orders only the m matching books.
  return mergeSort(filtered, (a, b) => {
    if (filters.sort === "title") return a.title.localeCompare(b.title);
    if (filters.sort === "availability") return b.available_copies - a.available_copies;
    if (filters.sort === "archived") {
      return new Date(b.archived_at || 0).getTime() - new Date(a.archived_at || 0).getTime();
    }
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });
};

const RESERVED = new Set<Borrow["status"]>(["PENDING_BORROW", "READY_FOR_PICKUP"]);
const ON_LOAN = new Set<Borrow["status"]>(["BORROWED", "OVERDUE", "PENDING_RETURN"]);

export const getBookCirculation = (bookId: string, borrows: Borrow[]) => {
  const current = borrows.filter(
    (borrow) => borrow.book_id === bookId && (RESERVED.has(borrow.status) || ON_LOAN.has(borrow.status)),
  );
  const reserved = current.filter((borrow) => RESERVED.has(borrow.status));
  const loans = current.filter((borrow) => ON_LOAN.has(borrow.status));
  return {
    onLoan: loans.length,
    reserved: reserved.length,
    records: current,
    hasBlocking: current.length > 0,
    blockingKind: reserved.length > 0 ? "request" as const : loans.length > 0 ? "loan" as const : null,
  };
};

export const formatBookDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};
