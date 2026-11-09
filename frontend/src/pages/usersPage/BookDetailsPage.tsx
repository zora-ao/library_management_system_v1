import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BookOpen, Bookmark, Heart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useFavoriteBooks,
  useGetBookById,
  useGetBookReviewStats,
  useToggleFavoriteBook,
} from "@/hooks/useBooks";
import { useCreateBorrows } from "@/hooks/useBorrows";
import { useAuth } from "@/hooks/useAuth";
import BookDetailsTable from "@/features/books/components/books/BookDetailsTable";
import BookReviews from "@/features/books/components/books/BookReviews";
import BookRecommendations from "@/features/books/components/books/BookRecommendations";
import AuthorOtherBooks from "@/features/books/components/books/AuthorOtherBooks";
import "./book-details.css";

export default function BookDetailsPage() {
  const { id } = useParams<{ id: string }>();
  return <BookDetailsContent key={id} bookId={id} />;
}

function BookDetailsContent({ bookId }: { bookId?: string }) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const { data: book, isLoading, isError, refetch } = useGetBookById(bookId);
  const { data: stats } = useGetBookReviewStats(bookId);
  const { data: favorites } = useFavoriteBooks();
  const toggleFavorite = useToggleFavoriteBook();
  const borrow = useCreateBorrows();
  if (isLoading) return <LoadingState containerClassName="h-96" label="Loading book details" />;
  if (isError || !book) return <div className="details-empty" role="alert"><h1>We couldn’t load this book.</h1><p>Please try again or return to the catalog.</p><Button onClick={() => void refetch()}>Try again</Button><Link to="/books">Back to catalog</Link></div>;
  const count = stats?.total_reviews ?? book.total_reviews ?? 0;
  const average = stats?.average_rating ?? book.average_rating ?? 0;
  const available = book.available_copies > 0;
  const isFavorite = Boolean(favorites?.some((fav) => fav.id === book.id));
  return <article className="book-details">
    <nav className="details-breadcrumb" aria-label="Breadcrumb"><Link to={user?.role === "student" ? "/books" : "/dashboard"}>Home</Link><span aria-hidden="true">›</span><Link to="/books">Catalog</Link><span aria-hidden="true">›</span><span aria-current="page">{book.title}</span></nav>
    <div className="details-overview">
      <div className="details-cover-display">{book.image_url ? <img src={book.image_url} alt={`${book.title} cover`} /> : <div className="details-no-cover"><BookOpen aria-hidden="true" /><span>{book.title}</span></div>}</div>
      <div className="details-summary">
        <p className="details-category">{book.category_name || "Uncategorized"}</p>
        <h1>{book.title}</h1><p className="details-byline">By {book.author}</p>
        <div className="details-rating"><span className="details-stars" role="img" aria-label={`${average.toFixed(1)} out of 5 stars`}>{[1, 2, 3, 4, 5].map(n => <Star key={n} size={17} aria-hidden="true" fill={n <= Math.round(average) ? "currentColor" : "none"} />)}</span><strong>{average.toFixed(1)}</strong><span>{count} {count === 1 ? "review" : "reviews"}</span></div>
        <p className={`details-description ${expanded ? "is-expanded" : ""}`}>{book.description || "No overview available for this title."}</p>
        {book.description && book.description.length > 160 && <button type="button" className="details-expand" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? "View less" : "View more"}</button>}
        <div className="details-actions">
          <Button className="details-borrow" disabled={!available || borrow.isPending || borrow.isSuccess} onClick={() => borrow.mutate({ book_id: book.id })}>
            <Bookmark size={18} strokeWidth={2} aria-hidden="true" />
            {borrow.isPending ? "Submitting…" : borrow.isSuccess ? "Request submitted" : !available ? "Out of stock" : "Borrow book"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className={`details-favorite ${isFavorite ? "is-favorite" : ""}`}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            disabled={toggleFavorite.isPending}
            onClick={() => toggleFavorite.mutate({ bookId: book.id, isFavorite })}
          >
            <Heart
              size={20}
              fill={isFavorite ? "currentColor" : "none"}
              strokeWidth={2}
              aria-hidden="true"
            />
          </Button>
        </div>
        <p className="details-borrow-note">14-day borrowing period</p>
      </div>
      <AuthorOtherBooks currentBookId={book.id} authorName={book.author} />
    </div>
    <Tabs defaultValue="details" className="details-tabs">
      <TabsList variant="line" className="details-tab-list" aria-label="Book information"><TabsTrigger value="details">Book Details</TabsTrigger><TabsTrigger value="reviews">Reviews ({count})</TabsTrigger><TabsTrigger value="recommendations">Recommendations</TabsTrigger></TabsList>
      <TabsContent value="details"><section className="details-information"><header className="details-panel-heading"><h2>Everything about this book</h2><p>Publication details and library information.</p></header><BookDetailsTable book={book} /></section></TabsContent>
      <TabsContent value="reviews"><BookReviews bookId={book.id} /></TabsContent>
      <TabsContent value="recommendations"><BookRecommendations bookId={book.id} /></TabsContent>
    </Tabs>
  </article>;
}
