import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import BookFormModal from "@/features/books/components/BookFormModal";
import BooksTable from "@/features/books/components/BooksTable";
import { type Book } from "@/features/books/types/book.types";
import { useBooks, useDeleteBooks } from "@/hooks/useBooks";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react"

const BooksListPage = () => {
  const { data: books = [], isLoading, isError, error } = useBooks();
  const deleteMutation = useDeleteBooks();

  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  const handleEdit = (book: Book) => {
    setSelectedBook(book);
  };

  const handleDelete = (bookId: number) => {
    if (confirm("Are you sure you want to delete this book?")) {
      deleteMutation.mutate(bookId);
    }
  };

  const handleCloseModal = () => {
    setIsAddOpen(false);
    setSelectedBook(null);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="m-6 rounded-md border border-destructive/20 bg-destructive/10 p-4 text-destructive">
        Error loading catalog: {error?.message || "Failed to fetch books"}
      </div>
    );
  }



  return (
    <div className="space-y-6  p-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Book Catalog</h1>
          <p className="text-sm text-muted-foreground">
            Manage titles, stock levels, and catalog items.
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Book
        </Button>
      </div>  

      <BooksTable
        books={books}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isDeleting={deleteMutation.isPending}
      />

      <BookFormModal
        isOpen={isAddOpen || !!selectedBook}
        onClose={handleCloseModal}
        book={selectedBook}
      />
    </div>
  )
}

export default BooksListPage
