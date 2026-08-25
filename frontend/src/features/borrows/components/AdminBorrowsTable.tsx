import { useState } from "react";
import type { Borrow } from "../types/borrow.types";
import { Book, Calendar, Clock, RotateCcw, Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AdminBorrowsTables {
  borrows: Borrow[];
  onReturn?: (borrowId: string) => void;
  isReturning: boolean;
  returningId?: string;
}

const AdminBorrowsTable = ({ borrows, onReturn, isReturning, returningId }: AdminBorrowsTables) => {
  const [search, setSearch] = useState("");

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
  };

  const filteredBorrows = borrows.filter((borrow) => {
    const query = search.toLowerCase();
    return (
      borrow.book_title?.toLowerCase().includes(query) ||
      borrow.user_name?.toLowerCase().includes(query) ||
      borrow.user_email?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-4">
      {/* search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by user or book..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Borrower</TableHead>
              <TableHead>Book</TableHead>
              <TableHead>Borrowed Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredBorrows.map((borrow) => {
              const isOverdue =
                !borrow.returned_at &&
                borrow.due_date &&
                new Date(borrow.due_date) < new Date();
              
              const isThisRowReturning = isReturning && returningId === borrow.id;

              return (
                <TableRow key={borrow.id}>
                  {/* borrower */}
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm leading-none">
                          {borrow.user_name || "Unknown User"}
                        </span>
                        <span className="text-xs text-muted-foreground mt-1">
                          {borrow.user_email}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* book details */}
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      {borrow.book_image ? (
                        <img
                          src={borrow.book_image}
                          alt={borrow.book_title || "Book"}
                          className="h-10 w-7 rounded border object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-7 items-center justify-center rounded border bg-muted">
                          <Book className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      )}
                      <span className="font-medium text-sm">
                        {borrow.book_title || "Unknown Book"}
                      </span>
                    </div>
                  </TableCell>

                  {/* borrowed date */}
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(borrow.borrowed_at)}
                    </div>
                  </TableCell>

                  {/* due date */}
                  <TableCell className="text-xs">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatDate(borrow.due_date)}
                    </div>
                  </TableCell>

                  {/* status */}
                  <TableCell>
                    {borrow.returned_at ? (
                      <Badge variant="outline" className="border-emerald-500 bg-emerald-50 text-emerald-600">
                        Returned
                      </Badge>
                    ) : isOverdue ? (
                      <Badge variant="destructive">Overdue</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                        Active
                      </Badge>
                    )}
                  </TableCell>

                  {/* action */}
                  <TableCell className="text-right">
                    {!borrow.returned_at ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isReturning && returningId === borrow.id}
                        onClick={() => onReturn?.(borrow.id)}
                        className="gap-1.5 text-xs"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {isThisRowReturning ? "Processing..." : "Mark Returned"}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>

                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export default AdminBorrowsTable
