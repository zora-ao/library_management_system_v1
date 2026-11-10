export interface IReview {
  id: string;
  username?: string;
  avatar_url?: string | null;
  rating: number;
  comment: string;
  created_at: string;
}

export class ReviewEntity {
  id: string;
  userName: string;
  avatarUrl: string | null;
  rating: number;
  comment: string;
  createdAt: Date;

  constructor(data: IReview){
    this.id = data.id;
    this.userName = data.username || "Anonymous";
    this.avatarUrl = data.avatar_url || null;
    this.rating = data.rating;
    this.comment = data.comment;
    this.createdAt = new Date(data.created_at);
  }

  get formattedDate(): string {
    return this.createdAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

}

export function sortReviews(reviews: ReviewEntity[], order: "newest" | "oldest"): ReviewEntity[] {
  return [...reviews].sort((a, b) => {
    const difference = a.createdAt.getTime() - b.createdAt.getTime();
    return order === "oldest" ? difference : -difference;
  });
}
