import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import type { Book } from "../types/book.types";
import { Badge } from "@/components/ui/badge";
import { BookCheck, BookOpen, Hash, Layers, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BookDetailsModalProps {
  book: Book;
  isOpen: boolean;
  onClose: () => void
  onBorrow?: (bookId: number) => void
}

const BookDetailsModal = ({book, isOpen, onClose, onBorrow}: BookDetailsModalProps) => {
  const isAvailable = book.available_copies > 0;

  const handleBorrow = () => {
    if(onBorrow) {
      onBorrow(parseInt(book.book_id));
    }
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden">

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-56 rounded-lg overflow-hidden bg-muted border flex items-center justify-center shadow-sm">
                {book.image_url ? (
                  <img
                    src={book.image_url}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <BookOpen className="h-10 w-10 stroke-1" />
                    <span className="text-xs">No Cover Available</span>
                  </div>
                )}
            </div>
            {/* Title */}
            <div className="md:col-span-2 space-y-4">
              <div className="space-y-2">
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                  {book.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <User className="h-3.5 w-3.5" />
                  Written by <span className="font-medium text-foreground">{book.author}</span>
                </DialogDescription>
              </div>

              {/* Category and available copies */}
              <div className="flex items-center gap-2 mb-4">
                {book.category && (
                  <Badge variant="secondary" className="text-xs">
                    {book.category}
                  </Badge>
                )}
                <Badge
                  variant={isAvailable ? "outline" : "destructive"}
                  className={`text-xs ${
                    isAvailable ? "border-emerald-500 text-emerald-600 bg-emerald-50" : ""
                  }`}
                >
                  {isAvailable ? `${book.available_copies} Copies Available` : "Out of Stock"}
                </Badge>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs uppercase font-semibold text-muted-foreground tracking-wider mb-1">
                  Description
                </h4>
                <p className="text-sm text-foreground/90 leading-relaxed max-h-36 overflow-y-auto pr-1">
                  {book.description || "No detailed synopsis available for this book."}
                </p>
              </div>

              {/* ISBN */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t text-xs">
                {book.isbn && (
                  <div className="flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">ISBN</p>
                      <p className="font-mono font-medium">{book.isbn}</p>
                    </div>
                  </div>
                )}

                {/* Pages */}
                {book.pages && (
                  <div className="flex items-center gap-2">
                    <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Pages</p>
                      <p className="font-medium">{book.pages} pages</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t flex items-center justify-between mb-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={handleBorrow}
            disabled={!isAvailable}
            className="flex items-center gap-2"
          >
            <BookCheck className="h-4 w-4" />
            {isAvailable ? "Borrow Book" : "Unavailable"}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  )
}

export default BookDetailsModal
