import { Badge } from "@/components/ui/badge";
import { BookOpen, Loader2 } from "lucide-react";
import { useGetBookRecommendations } from "@/hooks/useBooks";
import { formatAuthorName } from "../../../../utils/formatAuthorName"

  interface RelatedBookProps {
    currentBookId: string;
    authorName: string;
    onSelectBook: (id: string) => void;
  }

  const AuthorOtherBooks = ({ currentBookId, authorName, onSelectBook }: RelatedBookProps) => {

    const { data: recommendations, isLoading } = useGetBookRecommendations(currentBookId);

    const authorBooks = (recommendations || []).filter((book) => 
      book.id !== currentBookId && book.author === authorName
    ).slice(0, 3);

    const displayName = formatAuthorName(authorName,1);

    if (isLoading) {
    return (
      <div className="flex justify-center p-6">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

    return (
      <div className="space-y-4">
        <h3 className="text-sm font-bold tracking-tight text-foreground">
          More by {displayName}
        </h3>

        {authorBooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-4 text-center rounded-xl bg-muted/40 border border-dashed border-border/60 space-y-2">
            <BookOpen className="w-5 h-5 text-muted-foreground/60" />
            <p className="text-xs text-muted-foreground font-medium">
              No otauthorBooks by {displayName} found in the library.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {authorBooks.map((book) => (
              <div
                key={book.id}
                onClick={() => onSelectBook(book.id)}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-accent cursor-pointer transition-colors group"
              >
                <img
                  src={book.image_url || "/placeholder-cover.jpg"}
                  alt={book.title}
                  className="w-12 h-16 object-cover rounded-md border shadow-xs shrink-0 group-hover:scale-105 transition-transform"
                />
                <div className="space-y-1 min-w-0">
                  <h4 className="text-xs font-bold text-foreground truncate" title={book.title}>
                    {book.title}
                  </h4>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      book.available_copies > 0
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-muted text-muted-foreground border border-border"
                    }`}
                  >
                    {book.available_copies > 0 ? "Available" : "On Loan"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  export default AuthorOtherBooks; 