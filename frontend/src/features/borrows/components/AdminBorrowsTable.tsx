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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, CheckCircle2, XCircle, RotateCcw, Loader2 } from "lucide-react";

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

const AdminBorrowsTable = ({
  borrows,
  search,
  onApproveBorrow,
  onRejectBorrow,
  onConfirmReturn,
  isProcessing,
  processingId,
}: AdminBorrowsTableProps) => {
  // Filter by search query
  const filteredBorrows = borrows.filter((item) => {
    const q = search.toLowerCase();
    return (
      item.book_title?.toLowerCase().includes(q) ||
      item.user_name?.toLowerCase().includes(q)
    );
  });

  if (filteredBorrows.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground border rounded-md">
        No records found matching your search criteria.
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Book Title</TableHead>
            <TableHead>Borrower</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="text-right">Manage Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredBorrows.map((row) => {
            const isLoadingRow = isProcessing && processingId === row.id;

            return (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.book_title || "Untitled"}</TableCell>
                <TableCell>{row.user_name || "N/A"}</TableCell>
                <TableCell>
                  <Badge variant={row.status === "OVERDUE" ? "destructive" : "outline"}>
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
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
                            className="text-emerald-600 focus:text-emerald-700"
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
    </div>
  );
};

export default AdminBorrowsTable;