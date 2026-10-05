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
        (b) => b.status === "BORROWED" || (!b.returned_at && b.status !== "PENDING_BORROW")
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
      <div className="m-6 rounded-md border border-destructive/20 bg-destructive/10 p-4 text-destructive">
        Error loading borrow records: {error?.message || "Failed to fetch records"}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Circulation Management</h1>
        <p className="text-sm text-muted-foreground">
          Monitor active book loans, review pending pickup requests, and process returns across the library.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="bg-slate-100 border-none shadow-sm text-slate-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Total Records</CardTitle>
            <BookOpen className="h-4 w-4 text-slate-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{borrows.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-amber-100/70 border-none shadow-sm text-amber-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Pending Pickup</CardTitle>
            <Inbox className="h-4 w-4 text-amber-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingBorrows.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-sky-100 border-none shadow-sm text-sky-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Active Loans</CardTitle>
            <Clock className="h-4 w-4 text-sky-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeBorrows.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-destructive/15 border-none shadow-sm text-destructive-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-destructive">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {overdueBorrows.length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-100 border-none shadow-sm text-emerald-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Returned</CardTitle>
            <BookCheck className="h-4 w-4 text-emerald-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{returnedBorrows.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs and Search */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="grid w-full max-w-xl grid-cols-5">
            <TabsTrigger value="all">All ({borrows.length})</TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({pendingBorrows.length})
            </TabsTrigger>
            <TabsTrigger value="active">Active ({activeBorrows.length})</TabsTrigger>
            <TabsTrigger
              value="overdue"
              className="data-[state=active]:text-destructive"
            >
              Overdue ({overdueBorrows.length})
            </TabsTrigger>
            <TabsTrigger value="returned">Returned ({returnedBorrows.length})</TabsTrigger>
          </TabsList>

          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user or book..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Tab Content Wrappers */}
        <TabsContent value="all">
          <AdminBorrowsTable
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