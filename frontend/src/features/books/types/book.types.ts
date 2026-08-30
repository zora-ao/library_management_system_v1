export interface Review {
  id: string;
  user_id: string;
  user_name?: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface ReviewStatsResponse {
  average_rating: number;
  total_reviews: number;
}

export interface ReviewResponse extends Review {
  book_id: string;
}

export interface Book {
  id: string;
  isbn?: string;
  title: string;
  author: string;
  category_name?: string;
  category_id: string;
  total_copies: number;
  available_copies: number;
  image_url: string;
  description?: string;
  pages: number;
  average_rating?: number;
  total_reviews?: number;
  reviews?: Review[];
  publication_year: number;
  created_at?: string;
}

export interface BookResponse {
  message: string;
  book: Book
}