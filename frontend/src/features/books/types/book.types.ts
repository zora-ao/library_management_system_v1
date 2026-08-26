
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
}

export interface BookResponse {
  message: string;
  book: Book
}