// src/features/books/components/PopularBooks.tsx

import React from "react";
import BookCard from "./BookCard";
import type { Book } from "../../types/book.types";

interface PopularBooksProps {
  books: Book[];
}

export const PopularBooks: React.FC<PopularBooksProps> = ({ books }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Popular</h2>
        <button className="text-xs font-medium text-emerald-600 hover:underline">
          View all
        </button>
      </div>

      {/* Grid with small fixed-width columns */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3.5">
        {books.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    </div>
  );
};