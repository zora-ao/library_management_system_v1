import { useMemo, useState } from "react";
import { AlertCircle, FolderCog, Plus, Search } from "lucide-react";
import FilterSelect from "@/components/ui/FilterSelect";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-spinner";
import { TablePagination } from "@/components/ui/table-pagination";
import BookArchiveDialog from "@/features/books/components/books/BookArchiveDialog";
import BookDetailsDialog from "@/features/books/components/books/BookDetailsDialog";
import BookFormModal from "@/features/books/components/books/BookFormModal";
import BookRestoreDialog from "@/features/books/components/books/BookRestoreDialog";
import BooksTable from "@/features/books/components/books/BooksTable";
import { filterAndSortBooks, getBookCirculation, getBookSummary } from "@/features/books/lib/bookListView";
import type { Book, StaffBookState } from "@/features/books/types/book.types";
import { useAdminBorrows } from "@/hooks/useBorrows";
import { useArchiveBook, useRestoreBook, useStaffBooks } from "@/hooks/useBooks";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;
const EMPTY_BOOKS: Book[] = [];

const BooksListPage = () => {
  const activeQuery = useStaffBooks("active");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const archivedQuery = useStaffBooks("archived");
  const borrowQuery = useAdminBorrows();
  const archiveMutation = useArchiveBook();
  const restoreMutation = useRestoreBook();
  const [state, setState] = useState<StaffBookState>("active");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [availability, setAvailability] = useState<"all" | "available" | "unavailable">("all");
  const [archiveDate, setArchiveDate] = useState("");
  const [sort, setSort] = useState<"recent" | "title" | "availability" | "archived">("recent");
  const [page, setPage] = useState(1);
  const [formBook, setFormBook] = useState<Book | null | undefined>(undefined);
  const [manualDetailsBook, setManualDetailsBook] = useState<Book | null>(null);
  const [archiveBook, setArchiveBook] = useState<Book | null>(null);
  const [restoreBook, setRestoreBook] = useState<Book | null>(null);

  const activeBooks = activeQuery.data ?? EMPTY_BOOKS;
  const archivedBooks = archivedQuery.data ?? EMPTY_BOOKS;
  const selectedQuery = state === "active" ? activeQuery : archivedQuery;
  const circulationAvailable = !borrowQuery.isLoading && !borrowQuery.isError;
  const source = state === "active" ? activeBooks : archivedBooks;
  const summary = getBookSummary(activeBooks);
  const categories = useMemo(() => Array.from(new Map([...activeBooks, ...archivedBooks].flatMap((book) => book.category_id ? [[book.category_id, book.category_name || "Uncategorized"] as const] : []))).sort((a, b) => a[1].localeCompare(b[1])), [activeBooks, archivedBooks]);
  const filtered = useMemo(() => filterAndSortBooks(source, { search, category, availability: state === "active" ? availability : "all", archiveDate: state === "archived" ? archiveDate : "", sort }), [source, search, category, availability, archiveDate, sort, state]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const linkedBookId = searchParams.get("book");
  const linkedBook = linkedBookId ? activeBooks.find((book) => book.id === linkedBookId) ?? null : null;
  const detailsBook = manualDetailsBook ?? linkedBook;

  const switchState = (next: StaffBookState) => { setState(next); setPage(1); setSearch(""); setCategory("all"); setAvailability("all"); setArchiveDate(""); setSort(next === "active" ? "recent" : "archived"); };
  const closeDetails = () => {
    setManualDetailsBook(null);
    if (searchParams.has("book")) {
      const next = new URLSearchParams(searchParams);
      next.delete("book");
      setSearchParams(next, { replace: true });
    }
  };
  const startEdit = (book: Book) => { closeDetails(); setFormBook(book); };
  const startArchive = (book: Book) => { closeDetails(); setArchiveBook(book); };
  const startRestore = (book: Book) => setRestoreBook(book);
  const confirmArchive = (book: Book) => archiveMutation.mutate(book.id, { onSuccess: () => setArchiveBook(null) });
  const confirmRestore = (book: Book) => restoreMutation.mutate(book.id, { onSuccess: () => setRestoreBook(null) });

  const cards = [
    ["Total titles", summary.totalTitles, "Across the active catalog", "total-titles"],
    ["Total copies", summary.totalCopies, "Physical books registered", "total-copies"],
    ["Available copies", summary.availableCopies, "Ready to be borrowed", "available-copies"],
    ["Unavailable titles", summary.unavailableTitles, "No copies currently available", "unavailable-titles"],
  ];

  return <div className="w-full space-y-7 pb-10">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-sm">Library catalog</p><h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">Books List</h1><p className="mt-2 text-sm text-muted-foreground sm:text-base lg:text-lg">Manage titles, inventory, and archived records.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" className="text-xs sm:text-sm" onClick={() => navigate("/categories")}><FolderCog /> Categories</Button><Button className="text-xs sm:text-sm" onClick={() => setFormBook(null)}><Plus /> Add book</Button></div></header>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Catalog summary">{cards.map(([label, value, hint, testId]) => <article key={label} className="rounded-3xl border border-border/70 bg-card p-5 shadow-[var(--glass-shadow)] backdrop-blur-xl"><p className="text-sm font-medium text-muted-foreground sm:text-base lg:text-lg">{label}</p><strong data-testid={testId} className="mt-2 block text-2xl font-semibold sm:text-3xl lg:text-4xl">{value}</strong><p className="mt-1 text-xs text-muted-foreground sm:text-sm lg:text-base">{hint}</p></article>)}</section>
    <section className="min-h-[570px] overflow-hidden rounded-3xl border border-border/70 bg-card shadow-[var(--glass-shadow)] backdrop-blur-xl">
      <div className="flex flex-col gap-3 border-b border-border px-5 pt-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-6"><button type="button" onClick={() => switchState("active")} className={cn("border-b-2 border-transparent pb-3 text-sm font-semibold text-muted-foreground transition-colors sm:text-base lg:text-lg", state === "active" && "border-primary text-foreground")}>All Books&nbsp; {activeBooks.length}</button><button type="button" onClick={() => switchState("archived")} className={cn("border-b-2 border-transparent pb-3 text-sm font-semibold text-muted-foreground transition-colors sm:text-base lg:text-lg", state === "archived" && "border-primary text-foreground")}>Archived&nbsp; {archivedBooks.length}</button></div><p className="pb-3 text-xs text-muted-foreground sm:text-sm lg:text-base">{filtered.length} {filtered.length === 1 ? "title" : "titles"}</p></div>
      <div className="grid gap-3 border-b border-border p-5 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_170px_160px_170px]">
        <label className="relative"><span className="sr-only">Search books</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input type="search" aria-label="Search books" className="h-10 bg-control pl-9 text-sm sm:text-base md:text-base" placeholder="Search title, author, or ISBN" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label>
        <FilterSelect
          label="Category"
          value={category}
          onChange={(val) => { setCategory(val); setPage(1); }}
          options={[
            { value: "all", label: "All categories" },
            ...categories.map(([id, name]) => ({ value: String(id), label: name })),
          ]}
        />
        {state === "active" ? (
          <FilterSelect
            label="Availability"
            value={availability}
            onChange={(val) => { setAvailability(val as typeof availability); setPage(1); }}
            options={[
              { value: "all", label: "All availability" },
              { value: "available", label: "Available" },
              { value: "unavailable", label: "Unavailable" },
            ]}
          />
        ) : <Input aria-label="Archive date" type="date" className="h-10 bg-control text-sm sm:text-base" value={archiveDate} onChange={(event) => { setArchiveDate(event.target.value); setPage(1); }} />}
        <FilterSelect
          label="Sort books"
          value={sort}
          onChange={(val) => setSort(val as typeof sort)}
          options={[
            ...(state === "archived" ? [{ value: "archived", label: "Recently archived" }] : []),
            { value: "recent", label: "Recently added" },
            { value: "title", label: "Title A–Z" },
            ...(state === "active" ? [{ value: "availability", label: "Most available" }] : []),
          ]}
        />
      </div>
      {selectedQuery.isLoading ? <LoadingState className="text-primary" containerClassName="min-h-72" label={`Loading ${state === "active" ? "active" : "archived"} books`} /> : selectedQuery.isError ? <div className="flex min-h-72 items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive sm:text-base"><AlertCircle className="size-4 shrink-0" />Could not load {state === "active" ? "active" : "archived"} books.</div> : <>
        <BooksTable books={visible} state={state} onView={setManualDetailsBook} onEdit={startEdit} onArchive={startArchive} onRestore={startRestore} isProcessing={archiveMutation.isPending || restoreMutation.isPending} />
        <TablePagination page={currentPage} pageSize={PAGE_SIZE} totalItems={filtered.length} itemLabel="books" onPageChange={setPage} />
      </>}
    </section>
    <BookDetailsDialog book={detailsBook} borrows={circulationAvailable ? (borrowQuery.data || []) : []} circulationAvailable={circulationAvailable} open={!!detailsBook} onOpenChange={(open) => !open && closeDetails()} onEdit={startEdit} onArchive={startArchive} />
    <BookFormModal isOpen={formBook !== undefined} onClose={() => setFormBook(undefined)} book={formBook} />
    <BookArchiveDialog open={!!archiveBook} book={archiveBook} circulation={getBookCirculation(archiveBook?.id || "", circulationAvailable ? (borrowQuery.data || []) : [])} circulationAvailable={circulationAvailable} isPending={archiveMutation.isPending} onOpenChange={(open) => !open && setArchiveBook(null)} onConfirm={confirmArchive} />
    <BookRestoreDialog open={!!restoreBook} book={restoreBook} isPending={restoreMutation.isPending} onOpenChange={(open) => !open && setRestoreBook(null)} onConfirm={confirmRestore} />
  </div>;
};

export default BooksListPage;
