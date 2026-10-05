import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Loader2,
  Inbox,
} from "lucide-react";

interface BorrowItem {
  id: string;
  book_title?: string;
  user_name?: string;
  status: "PENDING_BORROW" | "BORROWED" | "PENDING_RETURN" | "RETURNED" | "REJECTED" | "OVERDUE";
  borrowed_at?: string | null;
  due_date?: string | null;
  returned_at?: string | null;
}

interface AdminBorrowsTableProps {
  borrows: BorrowItem[];
  search: string;
  onApproveBorrow?: (id: string) => void;
  onRejectBorrow?: (id: string) => void;
  onConfirmReturn?: (id: string) => void;
  isProcessing?: boolean;
  processingId?: string | null;
}

// Design-system status badges: friendly label + palette tint
const STATUS_STYLES: Record<
  BorrowItem["status"],
  { label: string; className: string }
> = {
  PENDING_BORROW: { label: "Pending", className: "bg-warning/10 text-warning" },
  BORROWED: { label: "Borrowed", className: "bg-secondary text-secondary-foreground" },
  PENDING_RETURN: { label: "Pending return", className: "bg-warning/10 text-warning" },
  RETURNED: { label: "Returned", className: "bg-success/10 text-success" },
  REJECTED: { label: "Rejected", className: "bg-muted text-muted-foreground" },
  OVERDUE: { label: "Overdue", className: "bg-destructive/10 text-destructive" },
};

const ROWS_PER_PAGE = 10;

const getPageItems = (current: number, total: number): (number | "ellipsis")[] => {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "ellipsis")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("ellipsis");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("ellipsis");
  pages.push(total);
  return pages;
};

const AdminBorrowsTable = ({
  borrows,
  search,
  onApproveBorrow,
  onRejectBorrow,
  onConfirmReturn,
  isProcessing,
  processingId,
}: AdminBorrowsTableProps) => {
  const [page, setPage] = useState(1);

  // Filter by search query
  const filteredBorrows = borrows.filter((item) => {
    const q = search.toLowerCase();
    return (
      item.book_title?.toLowerCase().includes(q) ||
      item.user_name?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredBorrows.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const pageRows = filteredBorrows.slice(startIndex, startIndex + ROWS_PER_PAGE);
  const endIndex = Math.min(startIndex + ROWS_PER_PAGE, filteredBorrows.length);

  if (filteredBorrows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center border rounded-lg bg-card">
        <Inbox className="h-8 w-8 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">No records found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {search
              ? "Try a different search term."
              : "There are no borrow records in this list yet."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Book Title</TableHead>
            <TableHead>Borrower</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageRows.map((row) => {
            const isLoadingRow = isProcessing && processingId === row.id;
            const status = STATUS_STYLES[row.status] ?? {
              label: row.status,
              className: "bg-muted text-muted-foreground",
            };

            return (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.book_title || "Untitled"}</TableCell>
                <TableCell>{row.user_name || "N/A"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("border-transparent", status.className)}>
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {row.due_date ? new Date(row.due_date).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Button variant="ghost" className="h-8 w-8 p-0" disabled={isLoadingRow}>
                        {isLoadingRow ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreHorizontal className="h-4 w-4" />
                        )}
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                      <DropdownMenuSeparator />

                      {row.status === "PENDING_BORROW" && (
                        <>
                          <DropdownMenuItem
                            onClick={() => onApproveBorrow?.(row.id)}
                            className="text-success focus:text-success"
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Approve Pickup
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onRejectBorrow?.(row.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject Request
                          </DropdownMenuItem>
                        </>
                      )}

                      {(row.status === "BORROWED" || row.status === "PENDING_RETURN" || row.status === "OVERDUE") && (
                        <DropdownMenuItem onClick={() => onConfirmReturn?.(row.id)}>
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Mark as Returned
                        </DropdownMenuItem>
                      )}

                      {(row.status === "RETURNED" || row.status === "REJECTED") && (
                        <DropdownMenuItem disabled>
                          No pending actions
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Table Footer / Pagination */}
      <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Showing {startIndex + 1}–{endIndex} of {filteredBorrows.length} records
        </p>

        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  aria-disabled={currentPage === 1 || undefined}
                  className={cn(currentPage === 1 && "pointer-events-none opacity-50")}
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage > 1) setPage((p) => Math.max(1, p - 1));
                  }}
                />
              </PaginationItem>

              {getPageItems(currentPage, totalPages).map((item, i) =>
                item === "ellipsis" ? (
                  <PaginationItem key={`ellipsis-${i}`}>
                    <span className="flex size-8 items-center justify-center text-muted-foreground">
                      …
                    </span>
                  </PaginationItem>
                ) : (
                  <PaginationItem key={item}>
                    <PaginationLink
                      href="#"
                      isActive={item === currentPage}
                      size="default"
                      onClick={(e) => {
                        e.preventDefault();
                        setPage(item);
                      }}
                    >
                      {item}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  aria-disabled={currentPage === totalPages || undefined}
                  className={cn(currentPage === totalPages && "pointer-events-none opacity-50")}
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage < totalPages) setPage((p) => Math.min(totalPages, p + 1));
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
};

export default AdminBorrowsTable;
