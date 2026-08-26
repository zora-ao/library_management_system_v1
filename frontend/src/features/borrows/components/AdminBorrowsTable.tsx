import type { Borrow } from "../types/borrow.types";
import { Book, Calendar, Clock, RotateCcw, User } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

interface AdminBorrowsTables {
  borrows: Borrow[];
  onReturn?: (borrowId: string) => void;
  search: string;
  isReturning: boolean;
  returningId?: string;
  pageSize?: number;
}

const AdminBorrowsTable = ({ 
  borrows, search, onReturn, isReturning, returningId, pageSize = 10 
}: AdminBorrowsTables) => {
  const [currentPage, setCurrentPage] = useState(1);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
  };

  // you can search using book title, username, and email
  const filteredBorrows = borrows.filter((borrow) => {
    const query = search.toLowerCase();
    return (
      borrow.book_title?.toLowerCase().includes(query) ||
      borrow.user_name?.toLowerCase().includes(query) ||
      borrow.user_email?.toLowerCase().includes(query)
    );
  });

  // for pagination, total pages is 1 if there's no item or book
  const totalItems = filteredBorrows.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  // for safe pagination, users can't go up the total page
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize; // minus 1 because index always start at zero
  const paginatedBorrows = filteredBorrows.slice(startIndex, startIndex + pageSize);


  return (
    <div className="space-y-4">
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
            {paginatedBorrows.map((borrow) => {
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

      {/* pagination */}
      {totalItems > 0 && (
        <div className="flex flex-col items-center justify-between gap-4 px-2 py-1 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{startIndex + 1}</span> to{" "}
            <span className="font-medium text-foreground">
              {Math.min(startIndex + pageSize, totalItems)}
            </span>{" "}
            of <span className="font-medium text-foreground">{totalItems}</span> entries
          </p>

          <Pagination className="justify-center sm:justify-end">
            <PaginationContent>
              <PaginationItem>
                {/* for previous button */}
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (safePage > 1) setCurrentPage(safePage - 1);
                  }}
                  aria-disabled={safePage === 1}
                  className={safePage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>

              {/* links numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1 ).map((pageNum) => ( // it create space for the numbers first so I use Array.from for make the code shorter
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    href="#"
                    isActive={pageNum === safePage}
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage(pageNum);
                    }}
                    className="cursor-pointer"
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              ))}

              {/* for next button */}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (safePage < totalPages) setCurrentPage(safePage + 1);
                  }}
                  aria-disabled={safePage === totalPages}
                  className={safePage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>

            </PaginationContent>
          </Pagination>
        </div>
      )}

    </div>
  )
}

export default AdminBorrowsTable
