import { useState } from "react";
import { useBooks } from "@/hooks/useBooks";
import {
  ArrowRight,
  Loader2,
  Search,
  BookOpen,
} from "lucide-react";
import BookCard from "@/features/books/components/books/BookCard";
import BookFilters from "@/features/books/components/books/BookFilters";
import { Button } from "@/components/ui/button";
import BookPagination from "@/features/books/components/books/BookCatalogPagination";
import { useCategories } from "@/hooks/useCategories";


const ITEMS_PER_PAGE = 8;

const BookCatalogPage = () => {
  const { data: books = [], isLoading, isError, error } = useBooks();
  const { data: genres } = useCategories();

  console.log(genres)

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSort, setSelectedSort] = useState("A-Z");
  const [availability, setAvailability] = useState("all");
  const [selectedGenre, setSelectedGenre] = useState("All");


  const [currentPage, setCurrentPage] = useState(1);

  // Filter Logic
  const filteredBooks = books.filter((book) => {
    const matchesSearch =
      book.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.category_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesGenre =
      selectedGenre === "All" ||
      book.category_name?.toLowerCase() === selectedGenre.toLowerCase();

    const matchesAvailability =
      availability === "all" ||
      (availability === "available" && (book.available_copies ?? 0) > 0) ||
      (availability === "reserved" && (book.available_copies ?? 0) === 0);

    return matchesSearch && matchesGenre && matchesAvailability;
  });

  // Sorting Logic
  const sortedBooks = [...filteredBooks].sort((a, b) => {
    if (selectedSort === "A-Z") return (a.title || "").localeCompare(b.title || "");
    if (selectedSort === "Z-A") return (b.title || "").localeCompare(a.title || "");
    return 0;
  });

  // Popular Books 
  const popularBooks = [...sortedBooks]
    .sort((a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0))
    .slice(0, 5);

  // Pagination Calculations for All Books
  const totalPages = Math.ceil(sortedBooks.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedBooks = sortedBooks.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedSort("A-Z");
    setAvailability("all");
    setSelectedGenre("All");
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="m-6 p-4 border border-destructive/20 bg-destructive/10 text-destructive rounded-xl text-sm">
        Error loading catalog: {error ? (error as Error).message : "Failed to fetch catalog"}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 px-0 sm:px-0">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-black text-white p-8 md:px-5 flex items-center justify-between shadow-md">
        <div className="space-y-3 z-10 max-w-lg">
          <span className="inline-block px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[10px] font-semibold tracking-wider uppercase text-purple-100 border border-white/10">
            CURATED SELECTION
          </span>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight uppercase">
            MOST READ BOOKS THESE MONTHS
          </h1>
          <p className="text-xs md:text-sm text-purple-100/80 leading-relaxed">
            View trending books in this month and explore recommended reads curated by librarians.
          </p>
          <div className="pt-2">
            <Button
              size="sm"
              className="bg-primary hover:bg-primary rounded-full px-6 py-5 text-xs font-bold gap-2 shadow-sm transition-all hover:gap-3 cursor-pointer"
            >
              VIEW NOW <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="hidden lg:flex relative shrink-0 items-center justify-center pr-8 opacity-40">
          <BookOpen className="w-48 h-48 text-purple-200 stroke-[1.2]" />
        </div>
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="relative flex-1 flex items-center">
          <Search className="absolute left-4 w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search books"
            className="w-full bg-transparent pl-11 pr-4 py-2.5 text-xs sm:text-sm text-foreground focus:outline-none placeholder:text-slate-400"
          />
        </div>
        <Button 
          className="text-white rounded-xl px-6 py-2.5 text-xs font-semibold gap-2 shadow-xs shrink-0 cursor-pointer"
        >
          <Search className="w-3.5 h-3.5" />
          <p className="hidden md:block">Search</p>
        </Button>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
        <div className="lg:col-span-3">
          <BookFilters
            selectedSort={selectedSort}
            onSortChange={setSelectedSort}
            availability={availability}
            onAvailabilityChange={(val) => {
              setAvailability(val);
              setCurrentPage(1);
            }}
            selectedGenre={selectedGenre}
            onGenreChange={(genre) => {
              setSelectedGenre(genre);
              setCurrentPage(1);
            }}
            onClearFilters={handleClearFilters}
            genres={["All", ...(genres?.map(genre => genre.name) ?? [])]}
          />
        </div>

        <main className="lg:col-span-9 space-y-10">
          {/* Popular Section */}
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                  Popular
                </h2>
                <p className="text-xs text-muted-foreground">
                  Most requested titles this week
                </p>
              </div>
            </div>
            {popularBooks.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No popular books available matching filters.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {popularBooks.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            )}
          </section>

          {/* All Books Section with Pagination */}
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                  All Books
                </h2>
                <p className="text-xs text-muted-foreground">
                  Browse general catalog titles across all genres
                </p>
              </div>
            </div>

            {paginatedBooks.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No books found matching your criteria.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {paginatedBooks.map((book) => (
                    <BookCard key={book.id} book={book} />
                  ))}
                </div>

                {/* Clean Shadcn Pagination Component */}
                <BookPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  startIndex={startIndex}
                  itemsPerPage={ITEMS_PER_PAGE}
                  totalItems={sortedBooks.length}
                />
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default BookCatalogPage;