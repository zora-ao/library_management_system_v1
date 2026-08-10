
export interface Book {
  id: string;
  isbn?: string;
  title: string;
  author: string;
  category: string;
  totalCopies: number;
  availableCopies: number;
  image_url: string;
  description?: string;
  pages: number;
}

export interface BookResponse {
  message: string;
  book: Book
}