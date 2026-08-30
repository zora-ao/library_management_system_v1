import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useGetBookReviews, useSubmitReview } from "@/hooks/useBooks"
import { Loader2, Star } from "lucide-react";
import React, { useState } from "react";

interface BookReviewsProps {
  bookId: string
}

const BookReviews = ({ bookId }: BookReviewsProps) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const { data: reviews = [], isLoading, isError } = useGetBookReviews(bookId);

  const { mutate: addReview, isPending: isSubmitting, error: submitError } = useSubmitReview(bookId);

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();

    if (!comment.trim()) {
      setValidationError("Please write a short comment before submitting.");
      return;
    }

    setValidationError(null);

    addReview(
      { rating, comment },
      {
        onSuccess: () => {
          setComment("");
          setRating(5);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-xs text-destructive py-4">
        Failed to load reviews for this book.
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-2">
      <div className="flex items-center justify-between border-b border-black/10 pb-3">
        <h3 className="text-xs uppercase tracking-wider font-bold text-foreground">
          Ratings & Feedback ({reviews.length})
        </h3>
      </div>

      {/* review form */}
      <form 
        onSubmit={handleSubmit}
        className="p-4 rounded-xl bg-black/[0.02] border border-black/5 space-y-4"
      >
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
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
                    className={`h-5 w-5 ${
                      star <= (hoverRating || rating)
                        ? "fill-amber-500 text-amber-500"
                        : "text-muted-foreground/20"
                    }`}
                  />
                </button>
              ))}
            </div>
        </div>

        {/* comment */}
        <div className="space-y-1">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Write your feedback about this book..."
            rows={3}
            className="w-full text-xs rounded-lg border-black/10 bg-background resize-none focus-visible:ring-primary"
          />
        </div>

        {/* handle error */}
        {(validationError || submitError) && (
            <p className="text-xs text-destructive">
              {validationError || submitError?.message || "Failed to post review."}
            </p>
          )}
        
        <Button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2 text-xs font-bold rounded-xl"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Posting...
            </span>
          ) : (
            "Submit Review"
          )}
        </Button>
      </form>

      {/* Reviews List Feed */}
      <div className="space-y-3">
        {reviews.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">
            No feedback yet for this book. Be the first to share your thoughts!
          </p>
        ) : (
          reviews.map((rev) => (
            <div
              key={rev.id}
              className="p-4 rounded-xl bg-black/[0.02] border border-black/5 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  {rev.userName}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {rev.formattedDate}
                </span>
              </div>

              {/* Star Rating Display */}
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-3.5 w-3.5 ${
                      star <= rev.rating
                        ? "fill-amber-500 text-amber-500"
                        : "text-muted-foreground/20"
                    }`}
                  />
                ))}
              </div>

              {/* Comment Content */}
              <p className="text-xs text-muted-foreground leading-relaxed">
                {rev.comment}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default BookReviews
