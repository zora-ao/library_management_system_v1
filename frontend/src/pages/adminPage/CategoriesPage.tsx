import { useMemo, useState } from "react";
import { AlertCircle, Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import FilterSelect from "@/components/ui/FilterSelect";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-spinner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TablePagination } from "@/components/ui/table-pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import CategoryModal from "@/features/books/components/categories/CategoryModal";
import { filterAndSortCategories, getCategorySummary, type CategorySort } from "@/features/books/lib/categoryWorkspace";
import type { Category } from "@/features/books/types/category.types";
import { useAuth } from "@/hooks/useAuth";
import { useCategories, useDeleteCategory } from "@/hooks/useCategories";
import { useStaffBooks } from "@/hooks/useBooks";

const pad = (value: number) => String(value).padStart(2, "0");
const EMPTY_CATEGORIES: Category[] = [];
const PAGE_SIZE = 6;

const CategoriesPage = () => {
  const { user } = useAuth();
  const categoryQuery = useCategories();
  const booksQuery = useStaffBooks("active");
  const deleteMutation = useDeleteCategory();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<CategorySort>("name-asc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [managerCategory, setManagerCategory] = useState<Category | null>(null);
  const categories = categoryQuery.data ?? EMPTY_CATEGORIES;
  const books = booksQuery.data ?? [];
  const isAdmin = user?.role === "admin";
  const summary = getCategorySummary(categories);
  const filtered = useMemo(() => filterAndSortCategories(categories, search, sort), [categories, search, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const selectedBooks = selected ? books.filter((book) => book.category_id === selected.id) : [];

  const cards = [
    ["Total categories", pad(summary.totalCategories), "Organize your library collection", "total-categories"],
    ["Book titles", pad(summary.bookTitles), "Titles across all categories", "book-titles"],
    ["Empty categories", pad(summary.emptyCategories), "Ready for new books", "empty-categories"],
  ];

  return <div className="w-full space-y-7 pb-10">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-sm">Categories</p><h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Categories</h1><p className="mt-2 text-sm text-muted-foreground sm:text-base">Organize your collection so every book is easy to find.</p></div>
      {isAdmin && <Button className="mt-8 rounded-full text-xs sm:text-sm" onClick={() => { setManagerCategory(null); setManagerOpen(true); }} aria-label="Add category"><Plus /> Add category</Button>}
    </header>

    <section className="grid gap-4 md:grid-cols-3" aria-label="Category summary">
      {cards.map(([label, value, hint, testId]) => <article key={label} className="rounded-3xl border border-border/70 bg-card p-5 shadow-[var(--glass-shadow)] backdrop-blur-xl"><p className="text-sm font-medium text-muted-foreground sm:text-base">{label}</p><strong data-testid={testId} className="mt-2 block text-2xl font-semibold sm:text-3xl">{value}</strong><p className="mt-1 text-xs text-muted-foreground sm:text-sm">{hint}</p></article>)}
    </section>

    <section className="min-h-[590px] overflow-hidden rounded-3xl border border-border/70 bg-card shadow-[var(--glass-shadow)] backdrop-blur-xl">
        <div className="border-b border-border p-5"><h2 className="text-xl font-semibold sm:text-2xl">All categories</h2><p className="mt-1 text-sm text-muted-foreground sm:text-base">Keep category names clear and consistent.</p></div>
        <div className="grid gap-3 border-b border-border p-5 sm:grid-cols-[1fr_180px]">
          <label className="relative">
            <span className="sr-only">Search categories</span>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" aria-label="Search categories" className="h-10 bg-control pl-9 text-sm sm:text-base" placeholder="Search categories" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
          </label>
          <FilterSelect
            label="Sort categories"
            value={sort}
            onChange={(event) => { setSort(event as CategorySort); setPage(1); }}
            options={[
              { value: "name-asc", label: "Name A–Z" },
              { value: "name-desc", label: "Name Z–A" },
              { value: "most-books", label: "Most books" },
            ]}
          />
        </div>
        {categoryQuery.isLoading ? <LoadingState label="Loading categories" containerClassName="min-h-72" /> : categoryQuery.isError ? <div className="flex min-h-64 gap-2 p-6 text-sm text-destructive sm:text-base"><AlertCircle className="size-4" />Could not load categories.</div> : filtered.length === 0 ? <p className="flex min-h-64 items-center justify-center p-6 text-sm text-muted-foreground sm:text-base">No categories found.</p> : <>
          <div className="overflow-x-auto">
            <Table className="min-w-[720px] text-sm sm:text-base">
              <TableHeader><TableRow className="border-border bg-muted/60 hover:bg-muted/60"><TableHead>Category</TableHead><TableHead>Book titles</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>{visible.map((category) => <TableRow key={category.id} className="border-border/60 bg-card/30 hover:bg-muted/45"><TableCell className="font-medium">{category.name}</TableCell><TableCell>{category.book_count ?? 0}</TableCell><TableCell><span className="booky-badge text-xs sm:text-sm">{(category.book_count ?? 0) > 0 ? "In use" : "Empty"}</span></TableCell><TableCell className="text-right"><div className="flex flex-wrap justify-end gap-2">{(category.book_count ?? 0) > 0 && <Button variant="ghost" size="sm" className="text-xs sm:text-sm" aria-label={`View ${category.name} books`} onClick={() => setSelected(category)}><Eye /> View</Button>}{isAdmin && <><Button variant="ghost" size="sm" className="text-xs sm:text-sm" aria-label={`Edit ${category.name}`} onClick={() => { setManagerCategory(category); setManagerOpen(true); }}><Pencil /> Edit</Button><Button variant="ghost" size="sm" className="text-xs text-destructive sm:text-sm" aria-label={`Delete ${category.name}`} onClick={() => setDeleteTarget(category)}><Trash2 /> Delete</Button></>}</div></TableCell></TableRow>)}</TableBody>
            </Table>
          </div>
          <TablePagination page={currentPage} pageSize={PAGE_SIZE} totalItems={filtered.length} itemLabel="categories" onPageChange={setPage} />
        </>}
    </section>
    <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
      <SheetContent aria-label={selected ? `${selected.name} books` : "Category books"} className="w-full overflow-y-auto p-0 sm:max-w-[480px]">
        {selected && <>
          <SheetHeader className="border-b border-border px-6 py-5"><SheetTitle className="text-xl text-foreground sm:text-2xl">{selected.name} books</SheetTitle><SheetDescription className="text-sm sm:text-base">{selectedBooks.length} book {selectedBooks.length === 1 ? "title" : "titles"} in this category</SheetDescription></SheetHeader>
          <div className="space-y-3 p-6">{booksQuery.isLoading ? <LoadingState label="Loading category books" /> : booksQuery.isError ? <div className="flex gap-2 rounded-xl bg-destructive/10 p-4 text-sm text-destructive sm:text-base"><AlertCircle className="size-4 shrink-0" />Could not load books in this category.</div> : selectedBooks.length === 0 ? <p className="rounded-xl bg-muted p-6 text-sm text-muted-foreground sm:text-base">No active books in this category.</p> : selectedBooks.map((book) => <article key={book.id} className="flex flex-col gap-3 rounded-xl border border-border bg-muted p-4"><div><h3 className="text-sm font-bold text-foreground sm:text-base">{book.title}</h3><p className="mt-1 text-sm text-muted-foreground sm:text-base">{book.author}</p></div><Link className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-background px-4 text-sm font-semibold text-foreground hover:bg-accent sm:text-base" to={`/book-list?book=${encodeURIComponent(book.id)}`}>View book details</Link></article>)}</div>
        </>}
      </SheetContent>
    </Sheet>
    <aside className="rounded-xl bg-accent/60 p-5"><p className="text-sm font-bold text-heading">A category keeps related books together.</p><p className="mt-2 text-xs text-muted-foreground">Move its books to another category before deleting it. Your books are never deleted with a category.</p></aside>
    {isAdmin && managerOpen && <CategoryModal isOpen initialCategory={managerCategory} onClose={() => { setManagerOpen(false); setManagerCategory(null); }} />}
    <ConfirmDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)} description={`Are you sure you want to delete “${deleteTarget?.name}”?`} confirmLabel="Delete" variant="destructive" loading={deleteMutation.isPending} onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })} />
  </div>;
};

export default CategoriesPage;
