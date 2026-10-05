import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Borrow, BorrowStatus } from "../types/borrow.types";
import { Book, Calendar, Clock, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatAuthorName } from "@/utils/formatAuthorName";

interface BorrowsTableProps {
  borrows: Borrow[];
  onReturn?: (borrowId: string) => void;
  isReturning?: boolean;
  returningId?: string;
  isHistoryView?: boolean;
}

const BorrowsTable = ({
  borrows,
  onReturn,
  isReturning,
  returningId,
  isHistoryView = false,
}: BorrowsTableProps) => {
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
  };

  const renderStatusBadge = (status: BorrowStatus, isOverdue: boolean) => {
    if (isOverdue || status === "OVERDUE") {
      return <Badge variant="destructive">Overdue</Badge>;
    }

    switch (status) {
      case "PENDING_BORROW":
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50">
            Pending Approval
          </Badge>
        );
      case "BORROWED":
        return (
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
            Active / Borrowed
          </Badge>
        );
      case "PENDING_RETURN":
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-700 bg-blue-50">
            Pending Return
          </Badge>
        );
      case "RETURNED":
        return (
          <Badge variant="outline" className="border-slate-400 text-slate-600 bg-slate-50">
            Returned
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="outline" className="border-red-400 text-red-600 bg-red-50">
            Request Rejected
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
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
            {!isHistoryView && <TableHead className="text-right">Action</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {borrows.map((borrow) => {
            const isOverdue =
              borrow.status === "BORROWED" &&
              borrow.due_date !== null &&
              new Date(borrow.due_date) < new Date();

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
                    <div className="min-w-0">
                      <p className="truncate font-medium text-sm sm:text-base">
                        {borrow.book_title || "Unknown Book"}
                      </p>
                      {borrow.author && (
                        <span className="truncate text-xs text-muted-foreground mt-1 block">
                          {formatAuthorName(borrow.author, 1)}
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

                <TableCell>{renderStatusBadge(borrow.status, isOverdue)}</TableCell>

                {!isHistoryView && (
                  <TableCell className="text-right">
                    {borrow.status === "BORROWED" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isReturning && returningId === borrow.id}
                        onClick={() => onReturn?.(borrow.id)}
                        className="gap-1.5 text-xs"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {isThisRowReturning ? "Requesting..." : "Return"}
                      </Button>
                    ) : borrow.status === "PENDING_BORROW" ? (
                      <span className="text-xs text-muted-foreground italic">
                        Awaiting Pickup
                      </span>
                    ) : borrow.status === "PENDING_RETURN" ? (
                      <span className="text-xs text-muted-foreground italic">
                        Awaiting Return Confirmation
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default BorrowsTable;