import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Borrow } from "../types/borrow.types"
import { Book, Calendar, Clock, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface BorrowsTableProps {
  borrows: Borrow[];
  onReturn?: (bookId: string) => void;
  isReturning?: boolean;
  returningId?: string;
  isHistoryView?: boolean;
}

const BorrowsTable = ({ borrows, onReturn, isReturning, returningId, isHistoryView = false }: BorrowsTableProps) => {


  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Book</TableHead>
            <TableHead>Borrowed Date</TableHead>
            <TableHead>Due Date</TableHead>
            {isHistoryView && <TableHead>Returned Date</TableHead>}
            <TableHead>Status</TableHead>
            {!isHistoryView && (
              <TableHead className="text-right">Action</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {borrows.map((borrow) => {
            const isOverdue = borrow.status === "borrowed" && new Date(borrow.due_date) < new Date();

            const isThisRowReturning = isReturning && returningId === borrow.id;

            return (
              <TableRow key={borrow.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {borrow.book_image ? (
                      <img
                        src={borrow.book_image}
                        alt={borrow.book_title || "Book cover"}
                        className="h-12 w-9 rounded object-cover border bg-muted"
                      />
                    ) : (
                      <div className="flex h-12 w-9 items-center justify-center rounded border bg-muted text-muted-foreground">
                        <Book className="h-4 w-4" />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="font-medium leading-none">
                        {borrow.book_title || "Unknown Book"}
                      </span>
                      {borrow.author && (
                        <span className="text-xs text-muted-foreground mt-1">
                          {borrow.author}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>

                <TableCell className="text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(borrow.borrowed_at)}
                  </div>
                </TableCell>

                <TableCell className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {formatDate(borrow.due_date)}
                  </div>
                </TableCell>

                {isHistoryView && (
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(borrow.returned_at)}
                  </TableCell>
                )}

                <TableCell>
                  {borrow.status === "returned" || borrow.returned_at ? (
                    <Badge variant="outline" className="border-emerald-500 text-emerald-600 bg-emerald-50">
                      Returned
                    </Badge>
                  ) : isOverdue ? (
                    <Badge variant="destructive">Overdue</Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                      Borrowed
                    </Badge>
                  )}
                </TableCell>

                {!isHistoryView && (
                  <TableCell className="text-right">
                    {!borrow.returned_at && borrow.status !== "returned" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isReturning && returningId === borrow.id}
                        onClick={() => onReturn?.(borrow.id)}
                        className="gap-1.5 text-xs"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {isThisRowReturning ? "Returning..." : "Return"}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export default BorrowsTable
