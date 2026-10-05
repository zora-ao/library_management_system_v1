import { Button } from "@/components/ui/button";
import BookFormModal from "@/features/books/components/books/BookFormModal";
import BooksTable from "@/features/books/components/books/BooksTable";
import CategoryFilter from "@/features/books/components/categories/CategoryFilter";
import CategoryModal from "@/features/books/components/categories/CategoryModal";
import { type Book } from "@/features/books/types/book.types";
import { useBooks, useDeleteBooks } from "@/hooks/useBooks";
import { AlertCircle, Loader2, Plus } from "lucide-react";
import { useState } from "react"

const BooksListPage = () => {
  const { data: books = [], isLoading, isError, error } = useBooks();
  const deleteMutation = useDeleteBooks();

  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const handleEdit = (book: Book) => {
    setSelectedBook(book);
  };

  const handleDelete = (bookId: string) => {
    if (confirm("Are you sure you want to delete this book?")) {
      deleteMutation.mutate(bookId);
    }
  };

  const handleCloseModal = () => {
    setIsAddOpen(false);
    setSelectedBook(null);
  };

  const filteredBooks = selectedCategoryId
    ? books.filter((book) => book.category_id === selectedCategoryId)
    : books;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
        <span>Error loading catalog: {error?.message || "Failed to fetch books"}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Book Catalog</h1>
          <p className="text-sm text-muted-foreground">
            Manage titles, stock levels, and catalog items.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setIsCategoryModalOpen(true)}>
            Manage Categories
          </Button>
          <Button onClick={() => setIsAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Book
          </Button>
        </div>
      </div>

      <CategoryFilter
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
      />

      <BooksTable
        books={filteredBooks}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isDeleting={deleteMutation.isPending}
      />

      <BookFormModal
        isOpen={isAddOpen || !!selectedBook}
        onClose={handleCloseModal}
        book={selectedBook}
      />

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />
    </div>
  )
}

export default BooksListPage
