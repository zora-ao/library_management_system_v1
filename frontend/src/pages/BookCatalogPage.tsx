import { useState } from "react";
import { useBooks } from "@/hooks/useBooks";
import { Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import BookCard from "@/features/books/components/books/BookCard";
import { NavLink } from "react-router-dom";

const BookCatalogPage = () => {
  const { data: books = [], isLoading, isError, error } = useBooks();
  const [search, setSearch] = useState("");

  const filteredBooks = books.filter(
    (book) =>
      book.title.toLowerCase().includes(search.toLowerCase()) ||
      book.author.toLowerCase().includes(search.toLowerCase())
  );

  // Group books into sections
  const popularBooks = filteredBooks.slice(0, 5);
  const recommendedBooks = filteredBooks.slice(4, 8);
  const otherBooks = filteredBooks.slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="m-6 p-4 border border-destructive/20 bg-destructive/10 text-destructive rounded-md">
        Error loading catalog: {error.message}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-12">
      {/* 1. CURATED HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white p-8 md:p-10 flex items-center justify-between shadow-lg">
        <div className="space-y-4 z-10 max-w-lg">
          <span className="inline-block px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[10px] font-semibold tracking-wider uppercase text-purple-200 border border-white/10">
            CURATED SELECTION
          </span>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight uppercase">
            MOST READ BOOKS THESE MONTHS
          </h1>
          <p className="text-xs md:text-sm text-purple-100/80 leading-relaxed">
            View trending books in this month and explore recommended reads curated by librarians.
          </p>
          <Button
            size="sm"
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-6 py-5 text-xs font-bold gap-2 shadow-md transition-all hover:gap-3"
          >
            VIEW NOW <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="hidden lg:block relative shrink-0">
          <div className="w-48 h-36 border-4 border-white/20 rounded-2xl rotate-6 flex items-center justify-center bg-white/5 backdrop-blur-xs">
            <div className="w-full h-full border-r-2 border-white/20" />
          </div>
        </div>
      </div>

      {/* 2. POPULAR SECTION */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">Popular</h2>
            <p className="text-xs text-muted-foreground">Most requested titles this week</p>
          </div>
          <NavLink to="/all-books?filter=popular" className="text-sm font-medium text-primary hover:text-black">
            View Popular
          </NavLink>
        </div>

        {popularBooks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No popular books available.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
            {popularBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </section>

      {/* 3. RECOMMENDED FOR YOU SECTION */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">Recommended For You</h2>
            <p className="text-xs text-muted-foreground">Based on your recent reading history and preferences</p>
          </div>
          <NavLink to="/all-books?filter=recommended" className="text-sm font-medium text-primary hover:text-black">
            View Recommended
          </NavLink>
        </div>

        {recommendedBooks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No recommendations found.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {recommendedBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </section>

      {/* 4. OTHER BOOKS SECTION */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">Other Books</h2>
            <p className="text-xs text-muted-foreground">Browse general catalog titles across all genres</p>
          </div>
          <NavLink to="/all-books" className="text-sm font-medium text-primary hover:text-black">
            View Others
          </NavLink>
        </div>

        {otherBooks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No books found matching your criteria.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
            {otherBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default BookCatalogPage;