import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-spinner";
import { useFavoriteBooks } from "@/hooks/useBooks";
import BookCard from "@/features/books/components/books/BookCard";
import { containsText, linearSearch, mergeSort } from "@/lib/dsa";
import BorrowSelect from "@/features/borrows/components/BorrowSelect";
import "./my-favorites.css";

const availabilityOptions = [
  { value: "all", label: "All books" },
  { value: "available", label: "Available now" },
  { value: "unavailable", label: "Currently unavailable" },
];

const sortOptions = [
  { value: "recent", label: "Recently added" },
  { value: "title", label: "Book title: A–Z" },
  { value: "rating", label: "Highest rated" },
];

function EmptyFavoritesIllustration() {
  return (
    <div className="favorites-empty-illustration" aria-hidden="true">
      <svg
        width="124"
        height="124"
        viewBox="0 0 124 124"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="62" cy="62" r="56" className="favorites-ill-circle" />
        {/* Tilted golden back book */}
        <g transform="rotate(-10 48 64)">
          <rect
            x="31"
            y="34"
            width="38"
            height="56"
            rx="5"
            fill="#E0BE6B"
          />
        </g>
        {/* Front dark olive hardcover book */}
        <rect
          x="48"
          y="29"
          width="44"
          height="62"
          rx="5"
          fill="#3E4237"
        />
        {/* Book spine highlight */}
        <line
          x1="55"
          y1="32"
          x2="55"
          y2="88"
          stroke="#6A6E61"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Cover title lines */}
        <line
          x1="64"
          y1="42"
          x2="82"
          y2="42"
          stroke="#6A6E61"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <line
          x1="64"
          y1="47"
          x2="78"
          y2="47"
          stroke="#6A6E61"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {/* Warm golden heart on front cover */}
        <path
          d="M73 70.5C73 70.5 64 64.6 64 58.6C64 55.9 66.1 53.8 68.7 53.8C70.4 53.8 71.9 54.7 73 56.1C74.1 54.7 75.6 53.8 77.3 53.8C79.9 53.8 82 55.9 82 58.6C82 64.6 73 70.5 73 70.5Z"
          fill="#E5C878"
        />
      </svg>
    </div>
  );
}

export default function MyFavoritesPage() {
  const favoritesQuery = useFavoriteBooks();
  const [query, setQuery] = useState("");
  const [availability, setAvailability] = useState("all");
  const [sort, setSort] = useState("recent");

  const records = useMemo(() => favoritesQuery.data ?? [], [favoritesQuery.data]);

  const visible = useMemo(() => {
    // Linear search, O(n), then merge sort, O(m log m).
    const filtered = linearSearch(records, (book) => {
      if (availability === "available" && book.available_copies <= 0) {
        return false;
      }
      if (availability === "unavailable" && book.available_copies > 0) {
        return false;
      }
      return containsText([book.title, book.author, book.category_name], query);
    });

    if (sort === "title") {
      return mergeSort(filtered, (a, b) => a.title.localeCompare(b.title));
    }
    if (sort === "rating") {
      return mergeSort(
        filtered, (a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0)
      );
    }
    return filtered;
  }, [records, query, availability, sort]);

  const savedCountLabel = `${records.length} saved ${records.length === 1 ? "book" : "books"}`;

  return (
    <div className="my-favorites">
      <header className="favorites-heading">
        <p>YOUR PERSONAL BOOKSHELF</p>
        <div className="favorites-title-row">
          <h1>My Favorites</h1>
          {!favoritesQuery.isLoading && !favoritesQuery.isError && (
            <span className="favorites-count-badge">{savedCountLabel}</span>
          )}
        </div>
        <span>Books you’d like to come back to.</span>
      </header>

      {favoritesQuery.isLoading ? (
        <LoadingState
          containerClassName="favorites-empty-center"
          label="Loading your favorite books"
        />
      ) : favoritesQuery.isError ? (
        <div className="favorites-empty-center" role="alert">
          <EmptyFavoritesIllustration />
          <h2>We couldn’t load your favorites</h2>
          <p>Please try again in a moment.</p>
          <button
            type="button"
            className="favorites-cta-button"
            onClick={() => void favoritesQuery.refetch()}
          >
            Try again
          </button>
        </div>
      ) : records.length === 0 ? (
        <section className="favorites-empty-center" aria-label="Empty favorites">
          <EmptyFavoritesIllustration />
          <h2>Your next great read is waiting</h2>
          <p>Tap the heart on a book to save it here for later.</p>
          <Link to="/books" className="favorites-cta-button">
            <span>Browse Books</span>
            <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" />
          </Link>
        </section>
      ) : (
        <section className="favorites-content">
          <div className="favorites-controls">
            <label className="favorites-search">
              <Search size={15} aria-hidden="true" />
              <input
                type="search"
                aria-label="Search your favorite books"
                placeholder="Search your favorite books by title, author, or genre"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <BorrowSelect
              label="Availability filter"
              value={availability}
              options={availabilityOptions}
              onChange={setAvailability}
            />
            <BorrowSelect
              label="Sort favorites"
              value={sort}
              options={sortOptions}
              onChange={setSort}
            />
          </div>

          <div className="favorites-result-info">
            <p aria-live="polite">
              Showing {visible.length} of {records.length} saved{" "}
              {records.length === 1 ? "book" : "books"}
            </p>
            <p>
              {sort === "title"
                ? "Sorted by book title"
                : sort === "rating"
                  ? "Highest rated books first"
                  : "Most recently saved first"}
            </p>
          </div>

          {visible.length ? (
            <div className="favorites-grid-panel">
              <div className="favorites-grid">
                {visible.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            </div>
          ) : (
            <div className="favorites-empty-center">
              <EmptyFavoritesIllustration />
              <h2>No favorite books match your search</h2>
              <p>Try a different title, author, or availability filter.</p>
              <button
                type="button"
                className="favorites-cta-button"
                onClick={() => {
                  setQuery("");
                  setAvailability("all");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
