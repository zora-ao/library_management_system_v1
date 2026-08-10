import { useState } from "react";
import type { Book } from "../types/book.types"
import { BookOpen, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import BookDetailsModal from "./BookDetailsModal";

interface BookCardProps {
  book: Book,
  onBorrow?: (bookId: number) => void;
}

const BookCard = ({ book, onBorrow }: BookCardProps) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);

  return (
    <>
      <div
        onClick={() => setIsDetailsOpen(true)}
        className="group relative border rounded-xl p-4 bg-card hover:bg-accent/40 hover:shadow-md transition-all cursor-pointer flex gap-4 w-full max-w-md select-none"
      >
        <div className="relative h-44 w-32 shrink-0 rounded-md overflow-hidden bg-muted border border-border flex items-center justify-center shadow-sm">
          {book.image_url ? (
            <img
              src={book.image_url}
              alt={book.title}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground p-2 text-center">
              <BookOpen className="h-8 w-8 stroke-1" />
              <span className="text-[10px] uppercase font-medium">No Cover</span>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between flex-1 min-w-0 py-0.5">
          <div className="space-y-1.5">
            {/* Category Badge & Availability */}
            <div className="flex items-center gap-2 flex-wrap">
              {book.category && (
                <Badge variant="secondary" className="text-xs font-medium px-2.5 py-0.5">
                  {book.category}
                </Badge>
              )}
              <Badge
                variant={book.available_copies > 0 ? "outline" : "destructive"}
                className={`text-[10px] px-2 py-0 ${
                  book.available_copies > 0
                    ? "border-emerald-500 text-emerald-600 bg-emerald-50/50"
                    : ""
                }`}
              >
                {book.available_copies > 0
                  ? `${book.available_copies} Available`
                  : "Out of Stock"}
              </Badge>
            </div>
            <h3 className="font-semibold text-foreground text-base line-clamp-2 leading-snug group-hover:text-primary transition-colors">
              {book.title}
            </h3>

            {/* Description Preview */}
            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
              {book.description || "No description provided for this title."}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
            <User className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
            <span className="truncate">
              Author: <strong className="font-medium text-foreground">{book.author}</strong>
            </span>
          </div>
        </div>
      </div>
      <BookDetailsModal
        book={book}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onBorrow={onBorrow}
      />
    </>
  )
}

export default BookCard
