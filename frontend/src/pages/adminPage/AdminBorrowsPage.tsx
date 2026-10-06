import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminBorrowsTable from "@/features/borrows/components/AdminBorrowsTable";
import {
  useAdminBorrows,
  useApproveReturn,
  useApproveBorrow,
  useRejectBorrow,
} from "@/hooks/useBorrows";
import {
  AlertCircle,
  BookCheck,
  BookOpen,
  Clock,
  Inbox,
  Loader2,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";

const AdminBorrowsPage = () => {
  const { data: borrows = [], isLoading, isError, error } = useAdminBorrows();

  // Action Mutations
  const returnMutation = useApproveReturn();
  const approveMutation = useApproveBorrow();
  const rejectMutation = useRejectBorrow();

  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");

  // Categorize borrow records based on status & dates
  const { pendingBorrows, activeBorrows, overdueBorrows, returnedBorrows } =
    useMemo(() => {
      const now = new Date();

      const pending = borrows.filter((b) => b.status === "PENDING_BORROW");
      const active = borrows.filter(
        (b) => b.status === "BORROWED" || b.status === "PENDING_RETURN"
      );
      const returned = borrows.filter(
        (b) => b.status === "RETURNED" || !!b.returned_at
      );
      const overdue = borrows.filter(
        (b) =>
          b.status === "OVERDUE" ||
          (b.status === "BORROWED" && b.due_date && new Date(b.due_date) < now)
      );

      return {
        pendingBorrows: pending,
        activeBorrows: active,
        overdueBorrows: overdue,
        returnedBorrows: returned,
      };
    }, [borrows]);

  // Unified status tracker for single-row spinners
  const isProcessing =
    returnMutation.isPending || approveMutation.isPending || rejectMutation.isPending;
  const processingId =
    (returnMutation.variables as string) ||
    (approveMutation.variables as string) ||
    (rejectMutation.variables as string);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        Error loading borrow records: {error?.message || "Failed to fetch records"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Borrows Management</h1>
        <p className="text-sm text-muted-foreground">
          Monitor active book borrowed, review pending pickup requests, and process returns across the library.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <Card className="col-span-2 md:col-span-1 md:row-span-2 justify-center">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Total Records</CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-4xl font-semibold tracking-tight">{borrows.length}</div>
              <p className="text-sm text-muted-foreground mt-1">
                All borrow records tracked across the library.
              </p>
            </div>

            {/* Status breakdown */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground border-t pt-3">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full bg-warning" />
                {pendingBorrows.length} Pending
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full bg-leather" />
                {activeBorrows.length} Active
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full bg-destructive" />
                {overdueBorrows.length} Overdue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full bg-success" />
                {returnedBorrows.length} Returned
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Pending Pickup</CardTitle>
            <Inbox className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight">{pendingBorrows.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Active Loans</CardTitle>
            <Clock className="h-4 w-4 text-leather" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight">{activeBorrows.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-destructive/10 ring-destructive/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-destructive">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight text-destructive">
              {overdueBorrows.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Returned</CardTitle>
            <BookCheck className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight">{returnedBorrows.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs and Search */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="grid w-full max-w-2xl grid-cols-5 h-9!">
            <TabsTrigger value="all">All ({borrows.length})</TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({pendingBorrows.length})
            </TabsTrigger>
            <TabsTrigger value="active">Active ({activeBorrows.length})</TabsTrigger>
            <TabsTrigger
              value="overdue"
              className="data-active:text-destructive!"
            >
              Overdue ({overdueBorrows.length})
            </TabsTrigger>
            <TabsTrigger value="returned">Returned ({returnedBorrows.length})</TabsTrigger>
          </TabsList>

          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user or book..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pl-9"
            />
          </div>
        </div>

        {/* Tab Content Wrappers */}
        <TabsContent value="all">
          <AdminBorrowsTable
            key={search}
            borrows={borrows}
            search={search}
            onApproveBorrow={(id) => approveMutation.mutate(id)}
            onRejectBorrow={(id) => rejectMutation.mutate(id)}
            onConfirmReturn={(id) => returnMutation.mutate(id)}
            isProcessing={isProcessing}
            processingId={processingId}
          />
        </TabsContent>

        <TabsContent value="pending">
          <AdminBorrowsTable
            key={search}
            borrows={pendingBorrows}
            search={search}
            onApproveBorrow={(id) => approveMutation.mutate(id)}
            onRejectBorrow={(id) => rejectMutation.mutate(id)}
            onConfirmReturn={(id) => returnMutation.mutate(id)}
            isProcessing={isProcessing}
            processingId={processingId}
          />
        </TabsContent>

        <TabsContent value="active">
          <AdminBorrowsTable
            key={search}
            borrows={activeBorrows}
            search={search}
            onApproveBorrow={(id) => approveMutation.mutate(id)}
            onRejectBorrow={(id) => rejectMutation.mutate(id)}
            onConfirmReturn={(id) => returnMutation.mutate(id)}
            isProcessing={isProcessing}
            processingId={processingId}
          />
        </TabsContent>

        <TabsContent value="overdue">
          <AdminBorrowsTable
            key={search}
            borrows={overdueBorrows}
            search={search}
            onApproveBorrow={(id) => approveMutation.mutate(id)}
            onRejectBorrow={(id) => rejectMutation.mutate(id)}
            onConfirmReturn={(id) => returnMutation.mutate(id)}
            isProcessing={isProcessing}
            processingId={processingId}
          />
        </TabsContent>

        <TabsContent value="returned">
          <AdminBorrowsTable
            key={search}
            borrows={returnedBorrows}
            search={search}
            onApproveBorrow={(id) => approveMutation.mutate(id)}
            onRejectBorrow={(id) => rejectMutation.mutate(id)}
            onConfirmReturn={(id) => returnMutation.mutate(id)}
            isProcessing={isProcessing}
            processingId={processingId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminBorrowsPage;
