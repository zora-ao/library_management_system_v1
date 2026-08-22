import BorrowsTable from "@/features/borrows/components/BorrowsTable";
import { useBorrows, useReturnBook } from "@/hooks/useBorrows"
import { BookOpen, Loader2 } from "lucide-react";


const MyBorrowsPage = () => {
  const { data: borrows = [], isLoading, isError, error } = useBorrows();
  const returnMutation = useReturnBook();

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
        Error loading borrowed books: {error?.message || "Failed to fetch records"}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight">My Borrowed Books</h1>
        <p className="text-sm text-muted-foreground">
          Track your active book loans, due dates, and return status.
        </p>
      </div>

      {borrows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <h3 className="text-lg font-semibold">No borrowed books</h3>
          <p className="text-sm text-muted-foreground mt-1">
            You don't have any active or past book loans yet.
          </p>
        </div>
      ) : (
        <BorrowsTable 
          borrows={borrows} 
          onReturn={(borrowId) => returnMutation.mutate(borrowId)}
          isReturning={returnMutation.isPending}
          returningId={returnMutation.variables} />
      )}
    </div>
  );
};

export default MyBorrowsPage
