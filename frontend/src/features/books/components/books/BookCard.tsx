import type { Book } from "../types/book.types";
import { useNavigate } from "react-router-dom";
import { BookOpen, Star } from "lucide-react";

interface BookCardProps {
  book: Book;
}

const BookCard = ({ book }: BookCardProps) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/books/${book.id}`)}
      className="group w-[115px] sm:w-[120px] cursor-pointer select-none space-y-1.5 mx-auto"
    >

      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-muted border border-border shadow-none transition-transform duration-200 group-hover:scale-[1.03]">
        {book.image_url ? (
          <img
            src={book.image_url}
            alt={book.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-2 text-muted-foreground text-center">
            <BookOpen className="h-6 w-6 stroke-1" />
            <span className="text-[9px] uppercase font-medium mt-1">No Cover</span>
          </div>
        )}
      </div>
      
      <div className="space-y-0.5 px-0.5">
        <h3 className="text-xs font-bold text-foreground line-clamp-1 leading-tight group-hover:text-emerald-600 transition-colors">
          {book.title}
        </h3>
        
        <p className="text-[10px] text-muted-foreground line-clamp-1">
          {book.author}
        </p>

        {/* Rating */}
        <div className="flex items-center gap-1 pt-0.5">
          <span className="text-[10px] font-semibold text-foreground">
            4.5
          </span>
          <Star className="h-2.5 w-2.5 fill-amber-400 stroke-amber-400" />
        </div>
      </div>
    </div>
  );
};

export default BookCard;