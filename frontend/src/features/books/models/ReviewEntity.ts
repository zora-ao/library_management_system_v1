export interface IReview {
  id: string;
  username: string;
  rating: number;
  comment: string;
  created_at: string;
}

export class ReviewEntity {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: Date;

  constructor(data: IReview){
    this.id = data.id;
    this.userName = data.username || "Anonymous";
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

  get isHighRating(): boolean {
    return this.rating >= 4;
  }

}