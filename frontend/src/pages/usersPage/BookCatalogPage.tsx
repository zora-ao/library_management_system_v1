import { useState } from "react";
import { useBooks } from "@/hooks/useBooks";
import { useCategories } from "@/hooks/useCategories";
import { LoadingState } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import BookCard from "@/features/books/components/books/BookCard";

const PAGE_SIZE = 8;
export default function BookCatalogPage() {
  const { data: books = [], isLoading, isError, refetch } = useBooks();
  const { data: categories = [] } = useCategories();
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("A-Z");
  const [availability, setAvailability] = useState<string | null>("all");
  const [genre, setGenre] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtered = books.filter(book =>
    [book.title, book.author, book.isbn, book.category_name].some(value => value?.toLowerCase().includes(query.trim().toLowerCase())) &&
    (genre === "All" || book.category_name === genre) && (availability !== "available" || book.available_copies > 0)
  ).sort((a, b) => sort === "Z-A" ? b.title.localeCompare(a.title) : a.title.localeCompare(b.title));
  const popular = [...books].sort((a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0)).slice(0, 4);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const start = (page - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);
  const genres = [...new Set([...categories.map(c => c.name), ...books.map(b => b.category_name).filter((name): name is string => !!name)])];
  const firstPage = Math.max(1, Math.min(page - 1, totalPages - 2));
  const pages = Array.from({ length: Math.min(3, totalPages) }, (_, i) => firstPage + i);
  function reset() { setInput(""); setQuery(""); setSort("A-Z"); setAvailability("all"); setGenre("All"); setCurrentPage(1); }
  return <>
    <section className="booky-banner" aria-labelledby="catalog-heading">
      <div><p className="booky-eyebrow">YOUR CAMPUS COLLECTION</p><h1 id="catalog-heading">Find your next chapter.</h1><p className="booky-banner-copy">Discover books for your studies, your interests, and everything in between.</p></div>
      <img src="/catalog/reading.svg" alt="An open book above a stack of books beside a plant" />
    </section>
    <form role="search" className="booky-search" onSubmit={e => { e.preventDefault(); setQuery(input); setCurrentPage(1); }}>
      <img src="/catalog/search.svg" alt="" /><input type="search" aria-label="Search title, author, or ISBN" placeholder="Search title, author, or ISBN" value={input} onChange={e => setInput(e.target.value)} /><Button type="submit" className="booky-search-button">Search</Button>
    </form>
    <div className="booky-grid">
      <aside className="booky-sidebar">
        <button type="button" className="booky-mobile-filters" aria-expanded={filtersOpen} aria-controls="catalog-filters" onClick={() => setFiltersOpen(!filtersOpen)}>{filtersOpen ? "Hide filters −" : "Filters & sorting +"}</button>
        <div id="catalog-filters" className={`booky-filters ${filtersOpen ? "is-open" : ""}`}>
          <div className="booky-filter-heading"><h2>Filters</h2><button type="button" onClick={reset}>Reset</button></div>
          <label className="booky-field-label" htmlFor="catalog-sort">SORT BY</label>
          <select id="catalog-sort" value={sort} onChange={e => { setSort(e.target.value); setCurrentPage(1); }}><option value="A-Z">Title: A–Z</option><option value="Z-A">Title: Z–A</option></select>
          <fieldset className="booky-availability"><legend>AVAILABILITY</legend>{[["all", "All books"], ["available", "Available now"]].map(([value, label]) => <label key={value}><input type="radio" name="availability" checked={availability === value} onChange={() => { setAvailability(value); if (value === "all") setGenre("All"); setCurrentPage(1); }} />{label}</label>)}</fieldset>
          <div className="booky-genres"><h3>GENRES</h3>{["All", ...genres].map(name => <button key={name} type="button" aria-pressed={genre === name} className={genre === name ? "is-active" : ""} onClick={() => { setGenre(name); setAvailability(name === "All" ? "all" : null); setCurrentPage(1); }}><span>{name === "All" ? "All genres" : name}</span><span>{name === "All" ? books.length : books.filter(b => b.category_name === name).length}</span></button>)}</div>
        </div>
      </aside>
      <div className="booky-results">
        {isLoading ? <LoadingState containerClassName="h-96" label="Loading catalog" /> : isError ? <div className="booky-empty" role="alert"><h2>We couldn’t load the catalog.</h2><p>Please try again in a moment.</p><Button type="button" onClick={() => void refetch()}>Try again</Button></div> : <>
          {genre === "All" && <section aria-labelledby="popular-heading">
            <div className="booky-section-heading"><div><h2 id="popular-heading">Popular this week</h2><p>A few campus favorites to get you started.</p></div><button type="button" onClick={() => document.getElementById("all-books")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Explore all&nbsp; →</button></div>
            {popular.length ? <div className="booky-cards">{popular.map(book => <BookCard key={book.id} book={book} variant="popular" />)}</div> : <p className="booky-empty">New campus favorites will appear here.</p>}
          </section>}
          <section id="all-books" aria-labelledby="browse-heading">
            <div className="booky-section-heading"><div><h2 id="browse-heading">Browse all books</h2><p aria-live="polite">Showing {visible.length} of {filtered.length} titles</p></div><span className="booky-chip">{genre === "All" ? "All genres" : genre}{availability !== null && <>&nbsp; · &nbsp;{availability === "all" ? "All availability" : "Available now"}</>}</span></div>
            {visible.length ? <div className="booky-cards">{visible.map(book => <BookCard key={book.id} book={book} variant="catalog" />)}</div> : <div className="booky-empty"><h3>{books.length ? "No books match your search." : "The library catalog is empty."}</h3>{books.length > 0 && <button type="button" onClick={reset}>Clear filters</button>}</div>}
            <div className="booky-pagination"><p>Showing {filtered.length ? start + 1 : 0}–{Math.min(start + PAGE_SIZE, filtered.length)} of {filtered.length} books</p><nav aria-label="Book pages">{page > 1 && <button type="button" onClick={() => setCurrentPage(page - 1)}>← Previous</button>}{pages.map(n => <button type="button" key={n} aria-label={`Page ${n}`} aria-current={page === n ? "page" : undefined} onClick={() => setCurrentPage(n)}>{n}</button>)}<button type="button" disabled={page >= totalPages} onClick={() => setCurrentPage(page + 1)}>Next →</button></nav></div>
          </section>
        </>}
      </div>
    </div>
  </>;
}
