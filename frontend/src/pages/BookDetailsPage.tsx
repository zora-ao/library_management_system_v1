import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGetBookById } from "@/hooks/useBooks";
import { ArrowLeft, BookOpen, Calendar, CheckCircle2, FileText, Hash, Loader2, User, XCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom"


const BookDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: book, isLoading, isError, error } = useGetBookById(id);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  };

  if (isError || !book) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 text-xs">
          <ArrowLeft className="h-4 w-4" /> Back to Catalog
        </Button>
        <div className="p-4 border border-destructive/20 bg-destructive/10 text-destructive rounded-xl text-sm">
          Failed to load book details: {error ? (error as Error).message : "Book not found"}
        </div>
      </div>
    );
  };

  const isAvailable = book.available_copies > 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Navigation Top Bar */}
      <div>
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="gap-2 text-xs text-muted-foreground hover:text-foreground p-0 h-auto"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Catalog
        </Button>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        
        {/* Left Column: Book Poster */}
        <div className="space-y-4">
          <div className="relative aspect-[3/4] w-full max-w-[280px] mx-auto md:max-w-none overflow-hidden rounded-2xl bg-muted border border-border shadow-md">
            {book.image_url ? (
              <img
                src={book.image_url}
                alt={book.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-muted-foreground">
                <BookOpen className="h-12 w-12 stroke-1" />
                <span className="text-xs font-semibold uppercase">No Cover Image</span>
              </div>
            )}
          </div>

          {/* Action Card */}
          <div className="bg-card border rounded-xl p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-muted-foreground">Availability Status:</span>
              {isAvailable ? (
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" /> In Stock ({book.available_copies})
                </span>
              ) : (
                <span className="flex items-center gap-1 text-destructive">
                  <XCircle className="h-3.5 w-3.5" /> Out of Stock
                </span>
              )}
            </div>

            <Button 
              disabled={!isAvailable} 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 rounded-lg"
            >
              {isAvailable ? "Borrow This Book" : "Currently Unavailable"}
            </Button>
          </div>
        </div>

        {/* Right Column: Metadata & Description */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Header Info */}
          <div className="space-y-2 border-b pb-4">
            <div className="flex items-center gap-2 flex-wrap">
              {book.category_name && (
                <Badge variant="secondary" className="text-xs font-medium">
                  {book.category_name}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs text-muted-foreground">
                {book.available_copies} of {book.total_copies} Copies Available
              </Badge>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
              {book.title}
            </h1>

            <p className="text-sm text-muted-foreground flex items-center gap-1.5 pt-1">
              <User className="h-4 w-4 text-emerald-600" /> By <span className="font-semibold text-foreground">{book.author}</span>
            </p>
          </div>

          {/* Key Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-muted/40 border rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                <Hash className="h-3 w-3" /> ISBN
              </span>
              <p className="text-xs font-semibold text-foreground truncate">
                {book.isbn || "N/A"}
              </p>
            </div>

            <div className="p-3 bg-muted/40 border rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3" /> Length
              </span>
              <p className="text-xs font-semibold text-foreground">
                {book.pages ? `${book.pages} Pages` : "N/A"}
              </p>
            </div>

            <div className="p-3 bg-muted/40 border rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Added Date
              </span>
              <p className="text-xs font-semibold text-foreground">
                {book.created_at ? new Date(book.created_at).toLocaleDateString() : "N/A"}
              </p>
            </div>
          </div>

          {/* Description Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Overview / Synopsis
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {book.description || "No description available for this book."}
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};

export default BookDetailsPage
