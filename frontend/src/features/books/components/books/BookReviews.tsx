import React, { useState } from "react";
import { Star } from "lucide-react";
import { ReviewEntity } from "../../models/ReviewEntity";
import { submitReview } from "../../api/books";

interface BookReviewsProps {
  bookId: string;
  reviews: ReviewEntity[];
  onReviewAdded?: (newReview: ReviewEntity) => void;
}

export const BookReviews: React.FC<BookReviewsProps> = ({
  bookId,
  reviews: initialReviews,
  onReviewAdded,
}) => {
  const [reviews, setReviews] = useState<ReviewEntity[]>(initialReviews);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError("Please write a short comment.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const newReview = await submitReview(bookId, {
        rating,
        comment,
      });

      setReviews([newReview, ...reviews]);
      setComment("");
      setRating(5);
      if (onReviewAdded) onReviewAdded(newReview);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to post review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-6 pt-8 border-t border-border">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold tracking-tight text-foreground uppercase">
          Ratings & Feedback ({reviews.length})
        </h3>
      </div>

      {/* Review Submission Form */}
      <form onSubmit={handleSubmit} className="p-4 border rounded-lg bg-card space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Your Rating
          </label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-0.5 focus:outline-none transition-transform hover:scale-110"
              >
                <Star
                  className={`h-6 w-6 ${
                    star <= (hoverRating || rating)
                      ? "fill-foreground text-foreground"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Write your feedback about this book..."
            rows={3}
            className="w-full p-3 text-sm rounded-md border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-foreground resize-none"
          />
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-foreground text-background rounded hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSubmitting ? "Posting..." : "Submit Review"}
        </button>
      </form>

      {/* Review Feed List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No feedback yet for this book.</p>
        ) : (
          reviews.map((rev) => (
            <div key={rev.id} className="p-4 border rounded-md space-y-2 bg-background">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{rev.userName}</span>
                <span className="text-xs text-muted-foreground">{rev.formattedDate}</span>
              </div>

              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-3.5 w-3.5 ${
                      star <= rev.rating
                        ? "fill-foreground text-foreground"
                        : "text-muted-foreground/20"
                    }`}
                  />
                ))}
              </div>

              <p className="text-xs text-foreground/90 leading-relaxed">{rev.comment}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
};