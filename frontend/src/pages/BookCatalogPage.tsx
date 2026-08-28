import { useState } from "react";
import BookCard from "@/features/books/components/BookCard";
import { useBooks } from "@/hooks/useBooks";
import { Loader2, Search, BookOpen, Bell, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LibrarySidebar } from "@/features/books/components/LibrarySidebar";

const BookCatalogPage = () => {
  const { data: books = [], isLoading, isError, error } = useBooks();
  const [search, setSearch] = useState("");

  const filteredBooks = books.filter(
    (book) =>
      book.title.toLowerCase().includes(search.toLowerCase()) ||
      book.author.toLowerCase().includes(search.toLowerCase())
  );

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
    <div className="px-2 max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
      
      {/* LEFT & CENTER MAIN CONTENT (3 Columns on Large Screens) */}
      <div className="lg:col-span-3 space-y-6">
        
        {/* Top Bar: Search Input */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search your book..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-muted/40 border-none rounded-full h-10 text-xs focus-visible:ring-1"
            />
          </div>
        </div>

        {/* Featured Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-purple-700 text-white p-6 md:p-8 flex items-center justify-between shadow-sm">
          <div className="space-y-3 z-10 max-w-md">
            <h2 className="text-xl md:text-2xl font-black tracking-wide uppercase">
              Most Read Books These Months
            </h2>
            <p className="text-xs text-purple-200">
              View trending books in this month and explore recommended reads.
            </p>
            <Button
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-5 text-xs font-bold"
            >
              VIEW NOW
            </Button>
          </div>
          <div className="hidden sm:flex items-center justify-center pr-4">
            <BookOpen className="h-28 w-28 text-purple-300/40" />
          </div>
        </div>

        {/* Popular Books Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground">Popular</h3>
            <button className="text-xs font-semibold text-emerald-600 hover:underline">
              View all
            </button>
          </div>

          {/* Compact Flex Container */}
          {filteredBooks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No books found matching your search.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3.5">
              {filteredBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )}
        </div>
      </div>

      <LibrarySidebar />

    </div>
  );
};

export default BookCatalogPage;