
export interface Book {
  book_id: string;
  isbn?: string;
  title: string;
  author: string;
  category: string;
  total_copies: number;
  available_copies: number;
  image_url: string;
  description?: string;
  pages: number;
}

export interface BookResponse {
  message: string;
  book: Book
}