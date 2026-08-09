
export interface Book {
  id: string;
  isbn?: string;
  title: string;
  author: string;
  category: string;
  totalCopies: number;
  availableCopies: number;
  imageUrl: string;
  description?: string;
  pages: number;
}

