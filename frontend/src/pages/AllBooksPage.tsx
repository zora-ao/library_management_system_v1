import { useSearchParams } from "react-router-dom";
import { useBooks } from "@/hooks/useBooks";
import BookCard from "@/features/books/components/books/BookCard";

const AllBooksPage = () => {
  const { data: books = [], isLoading } = useBooks();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read filter parameter from URL (e.g., "popular", "recommended", or null)
  const activeFilter = searchParams.get("filter") || "all";

  const handleFilterChange = (filter: string) => {
    if (filter === "all") {
      searchParams.delete("filter");
      setSearchParams(searchParams);
    } else {
      setSearchParams({ filter });
    }
  };

  const displayedBooks = books.filter((book) => {
    if (activeFilter === "popular") {
      return (book.average_rating ?? 0) >= 4.0; // Example filter criteria logic
    }
  
    return true; // "all" or default
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold capitalize">
          {activeFilter === "all" ? "All Books" : `${activeFilter} Books`}
        </h1>

        {/* Optional Filter Controls */}
        <div className="flex gap-2">
          {["all", "popular", "recommended"].map((filter) => (
            <button
              key={filter}
              onClick={() => handleFilterChange(filter)}
              className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                activeFilter === filter
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
        {displayedBooks.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    </div>
  );
};

export default AllBooksPage;