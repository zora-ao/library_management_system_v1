import { Badge } from "@/components/ui/badge";
import type { Book } from "../../types/book.types"

interface RelatedBookProps {
  authorName: string;
  books: Book[];
  onSelectBook: (id: string) => void;
}

const RelatedBook = ({ authorName, books, onSelectBook }: RelatedBookProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-base font-bold text-slate-900">More by {authorName}</h3>
      <div className="space-y-3">
        {books.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelectBook(item.id)}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100/60 cursor-pointer transition-colors"
          >
            <img
              src={item.image_url || "/placeholder-cover.jpg"}
              alt={item.title}
              className="w-12 h-16 object-cover rounded-md border shadow-sm flex-shrink-0"
            />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{item.title}</h4>
              <Badge
                variant="secondary"
                className={`text-[10px] px-2 py-0.5 rounded-full ${
                  item.available_copies > 0
                    ? "bg-purple-100 text-purple-700"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {item.available_copies > 0 ? "Available" : "On Loan"}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default RelatedBook
