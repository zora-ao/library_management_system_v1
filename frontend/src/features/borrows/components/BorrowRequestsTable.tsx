import { BookOpen, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { formatRequestDate, getBorrowReference, type BorrowRequestTab } from "../lib/borrowRequestView";
import type { Borrow } from "../types/borrow.types";

const labels: Record<Borrow["status"], string> = {
  PENDING_BORROW: "Pending review",
  READY_FOR_PICKUP: "For pickup",
  BORROWED: "Picked up",
  PENDING_RETURN: "Return pending",
  RETURNED: "Returned",
  REJECTED: "Rejected",
  OVERDUE: "Overdue",
};

const emptyCopy: Record<BorrowRequestTab, string> = {
  pending: "No borrow requests need review",
  pickup: "No books are waiting for pickup",
  rejected: "No rejected requests",
};

interface BorrowRequestsTableProps {
  rows: Borrow[];
  tab: BorrowRequestTab;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onOpen: (borrow: Borrow) => void;
}

export default function BorrowRequestsTable({
  rows,
  tab,
  page = 1,
  pageSize = 8,
  onPageChange,
  onOpen,
}: BorrowRequestsTableProps) {
  if (!rows.length) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="rounded-2xl bg-primary/10 p-3"><Inbox className="size-6 text-primary" /></span>
        <div><p className="font-semibold">{emptyCopy[tab]}</p><p className="mt-1 text-sm text-muted-foreground">New activity will appear here automatically.</p></div>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visible = rows.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <>
      <div className="overflow-x-auto">
        <Table className="min-w-[820px] text-sm sm:text-base">
          <TableHeader>
            <TableRow className="border-border bg-muted/60 hover:bg-muted/60">
              <TableHead>Student</TableHead><TableHead>Book / Request</TableHead><TableHead>Request Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row) => (
              <TableRow key={row.id} className="border-border/60 bg-card/30 hover:bg-muted/45">
                <TableCell><p className="font-medium">{row.user_name || "Unknown student"}</p><p className="text-xs text-muted-foreground sm:text-sm">{row.user_email || "No email available"}</p></TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {row.book_image ? <img src={row.book_image} alt="" className="h-12 w-9 rounded object-cover shadow-sm" /> : <span aria-label={`No cover available for ${row.book_title}`} className="flex h-12 w-9 items-center justify-center rounded bg-primary/10"><BookOpen className="size-4 text-primary" /></span>}
                    <div><p className="max-w-56 truncate font-medium">{row.book_title || "Untitled book"}</p><p className="text-xs text-muted-foreground sm:text-sm">{row.author || "Unknown author"} · {getBorrowReference(row)}</p></div>
                  </div>
                </TableCell>
                <TableCell>{formatRequestDate(row.created_at)}</TableCell>
                <TableCell><Badge variant="outline" className="border-primary/15 bg-primary/5 text-xs text-foreground sm:text-sm">{labels[row.status]}</Badge></TableCell>
                <TableCell className="text-right"><Button variant="outline" size="sm" className="text-xs sm:text-sm" onClick={() => onOpen(row)}>{tab === "pickup" ? "Confirm pickup" : "View details"}</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <TablePagination page={safePage} pageSize={pageSize} totalItems={rows.length} itemLabel="requests" onPageChange={(nextPage) => onPageChange?.(nextPage)} />
    </>
  );
}
