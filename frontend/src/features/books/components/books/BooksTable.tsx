import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Book } from "../../types/book.types";
import { BookOpen, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface BooksTableProps {
  books: Book[];
  onEdit: (book: Book) => void;
  onDelete: (bookId: string) => void;
  isDeleting?: boolean;
}

const BooksTable = ({ books, onEdit, onDelete, isDeleting }: BooksTableProps) => {

  if (books.length === 0) {
    return (
      <div className="rounded-md border bg-card p-8 text-center text-muted-foreground">
        No books found in inventory.
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Cover</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Author</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-center">Total Copies</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {books.map((book) => {
            const bookId = book.id;
            return (
              <TableRow key={bookId}>
                <TableCell>
                  <div className="flex h-12 w-9 items-center justify-center overflow-hidden rounded border bg-muted">
                    {book.image_url ? (
                        <img
                          src={book.image_url}
                          alt={book.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <BookOpen className="h-4 w-4 stroke-1 text-muted-foreground" />
                      )}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{book.title}</TableCell>
                <TableCell>{book.author}</TableCell>
                <TableCell>
                  {book.category_name ? (
                    <Badge variant="secondary" className="font-normal">
                      {book.category_name}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">{book.total_copies ?? 0}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(book)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(bookId)}
                    disabled={isDeleting}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  )
};

export default BooksTable
