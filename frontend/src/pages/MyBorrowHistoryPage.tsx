import BorrowsTable from "@/features/borrows/components/BorrowsTable";
import { useBorrowHistory } from "@/hooks/useBorrows"
import { History, Loader2 } from "lucide-react";

const MyBorrowHistoryPage = () => {
  const { data: history = [], isLoading, isError, error } = useBorrowHistory();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="m-6 rounded-md border border-destructive/20 bg-destructive/10 p-4 text-destructive">
        Error loading borrow history: {error?.message || "Failed to fetch records"}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Borrow History</h1>
        <p className="text-sm text-muted-foreground">
          A complete record of your past book loans and return dates.
        </p>
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <History className="mb-3 h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold">No history yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Books you borrow and return will appear here.
          </p>
        </div>
      ) : (
        <BorrowsTable borrows={history} isHistoryView={true} />
      )}
    </div>
  );
}

export default MyBorrowHistoryPage
