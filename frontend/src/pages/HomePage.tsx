import BookCard from "@/features/books/components/BookCard";
import { useBooks } from "@/hooks/useBooks"
import { Loader2 } from "lucide-react";


const HomePage = () => {
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
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {books.map((book) => (
        <BookCard key={book.id} book={book} />
      ))}
    </div>
  )
}

export default HomePage
