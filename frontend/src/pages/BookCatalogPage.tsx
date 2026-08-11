import BookCard from "@/features/books/components/BookCard";
import { useBooks } from "@/hooks/useBooks";
import { Loader2 } from "lucide-react";


const BookCatalogPage = () => {
  const { data: books = [], isLoading, isError, error } = useBooks();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 border border-destructive/20 bg-destructive/10 text-destructive rounded-md">
        Error loading catalog: {error.message}
      </div>
    );
  } 

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {books.map((book) => (
          <BookCard key={book.book_id} book={book} />
        ))}
      </div>
    </div>
  )
}

export default BookCatalogPage
