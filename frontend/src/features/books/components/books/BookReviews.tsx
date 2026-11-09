import { useState, type SubmitEvent } from "react";
import { AxiosError } from "axios";
import { Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LoadingState } from "@/components/ui/loading-spinner";
import { useGetBookReviews, useSubmitReview } from "@/hooks/useBooks";
import { sortReviews } from "../../models/ReviewEntity";

export default function BookReviews({ bookId }: { bookId: string }) {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [validation, setValidation] = useState("");
  const [order, setOrder] = useState<"newest" | "oldest">("newest");
  const { data: reviews = [], isLoading, isError, refetch } = useGetBookReviews(bookId);
  const { mutate, isPending, error } = useSubmitReview(bookId);
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  const errorMessage = error instanceof AxiosError ? error.response?.data?.message || error.message : error?.message;
  function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!comment.trim()) { setValidation("Please write a short comment before submitting."); return; }
    setValidation("");
    mutate({ rating, comment: comment.trim() }, { onSuccess: () => { setComment(""); setRating(5); } });
  }
  if (isLoading) return <LoadingState label="Loading reviews" containerClassName="py-12" />;
  if (isError) return <div className="details-empty" role="alert"><p>Couldn’t load reviews for this book.</p><Button onClick={() => void refetch()}>Try again</Button></div>;
  return <section className="details-reviews">
    <header className="details-panel-heading details-review-heading"><div><h2>Ratings &amp; feedback</h2><p>{reviews.length} {reviews.length === 1 ? "review" : "reviews"} from your library community</p></div><div className="details-review-average"><strong>{average.toFixed(1)}</strong><span role="img" aria-label={`${average.toFixed(1)} out of 5 stars`}>{[1,2,3,4,5].map(n => <Star key={n} size={16} aria-hidden="true" fill={n <= Math.round(average) ? "currentColor" : "none"} />)}</span></div></header>
    <form className="details-review-form" onSubmit={submit}>
      <h3>Share your thoughts</h3><fieldset className="details-rating-input"><legend>Your rating</legend><div>{[1,2,3,4,5].map(star => <label key={star} onMouseEnter={() => setHover(star)} onMouseLeave={() => setHover(0)}><input type="radio" name="review-rating" value={star} checked={rating === star} onChange={() => setRating(star)} aria-label={`${star} ${star === 1 ? "star" : "stars"}`} /><Star size={23} aria-hidden="true" fill={star <= (hover || rating) ? "currentColor" : "none"} /></label>)}</div></fieldset>
      <label className="sr-only" htmlFor="review-comment">Your review</label><Textarea id="review-comment" value={comment} onChange={event => setComment(event.target.value)} placeholder="Write your feedback about this book..." rows={3} aria-invalid={!!validation || !!error} aria-describedby={validation || error ? "review-error" : undefined} />
      {(validation || error) && <p id="review-error" className="details-review-error" role="alert">{validation || errorMessage || "Failed to post review."}</p>}
      <div className="details-review-submit"><Button type="submit" disabled={isPending}>{isPending ? "Posting…" : "Submit review"}</Button><p>Your review helps other students choose their next read.</p></div>
    </form>
    <div className="details-community-heading">
      <h3>Community reviews</h3>
      <Select value={order} onValueChange={(val) => { if (val) setOrder(val as "newest" | "oldest"); }}>
        <SelectTrigger aria-label="Sort reviews" className="h-8 w-36 rounded-lg text-xs bg-control/80 border-input">
          <SelectValue placeholder="Sort reviews" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Most recent ↓</SelectItem>
          <SelectItem value="oldest">Oldest first ↑</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div className="details-review-list">{reviews.length === 0 ? <p className="details-empty">No feedback yet. Be the first to share your thoughts!</p> : sortReviews(reviews, order).map(review => <article key={review.id} className="details-review-card"><Avatar className="details-review-avatar" aria-hidden="true">{review.avatarUrl && <AvatarImage src={review.avatarUrl} alt="" referrerPolicy="no-referrer" />}<AvatarFallback className="details-review-avatar-fallback">{review.userName.trim().split(/\s+/).map(part => part[0]).slice(0,2).join("").toUpperCase() || "R"}</AvatarFallback></Avatar><div className="details-review-body"><header><div><h4>{review.userName}</h4><span className="details-review-stars" role="img" aria-label={`${review.rating} out of 5 stars`}>{[1,2,3,4,5].map(n => <Star key={n} size={13} aria-hidden="true" fill={n <= review.rating ? "currentColor" : "none"} />)}</span></div><time dateTime={review.createdAt.toISOString()}>{review.formattedDate}</time></header><p>{review.comment}</p></div></article>)}</div>
  </section>;
}
