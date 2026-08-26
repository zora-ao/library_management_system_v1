import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BorrowsTable from "@/features/borrows/components/BorrowsTable";
import { useBorrowHistory, useBorrows, useReturnBook } from "@/hooks/useBorrows"
import { BookOpen, History, Loader2 } from "lucide-react";


const MyBorrowsPage = () => {
  const { 
    data: activeBorrows = [], 
    isLoading: isLoadingActive, 
    isError: isErrorActive, 
    error: errorActive 
  } = useBorrows();

  const { 
    data: historyBorrows = [], 
    isLoading: isLoadingHistory, 
    isError: isErrorHistory, 
    error: errorHistory 
  } = useBorrowHistory();

  const returnMutation = useReturnBook();


  return (
    <div className="space-y-6 p-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight">My Book Loans</h1>
        <p className="text-sm text-muted-foreground">
          Manage your active book loans, track due dates, and view past return history.
        </p>
      </div>

      {/* for tabs */}
      <Tabs defaultValue="active" className="w-full space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="active" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Active Loans
            {activeBorrows.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {activeBorrows.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Borrow History
          </TabsTrigger>
        </TabsList>

        {/* for tab 1 */}
        <TabsContent value="active">
          {isLoadingActive ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isErrorActive ? (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 p-4 text-destructive">
              Error loading active loans: {errorActive?.message || "Failed to fetch records"}
            </div>
          ) : activeBorrows.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <BookOpen className="mb-3 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold">No active loans</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                You don't have any books checked out right now.
              </p>
            </div>
          ) : (
            <BorrowsTable
              borrows={activeBorrows}
              onReturn={(borrowId) => returnMutation.mutate(borrowId)}
              isReturning={returnMutation.isPending}
              returningId={returnMutation.variables}
            />
          )}
        </TabsContent>

        {/* for tab 2 */}
        <TabsContent value="history">
          {isLoadingHistory ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isErrorHistory ? (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 p-4 text-destructive">
              Error loading borrow history: {errorHistory?.message || "Failed to fetch records"}
            </div>
          ) : historyBorrows.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <History className="mb-3 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold">No borrow history</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Books you borrow and return will show up here.
              </p>
            </div>
          ) : (
            <BorrowsTable borrows={historyBorrows} isHistoryView={true} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyBorrowsPage
