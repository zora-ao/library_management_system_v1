import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminBorrowsTable from "@/features/borrows/components/AdminBorrowsTable";
import { useAdminBorrows, useAdminReturnBook } from "@/hooks/useBorrows"
import { AlertCircle, BookCheck, BookOpen, Clock, Loader2, Search } from "lucide-react";
import { useMemo, useState } from "react";

const AdminBorrowsPage = () => {
  const { data: borrows = [], isLoading, isError, error } = useAdminBorrows();
  const returnMutation = useAdminReturnBook();
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");

  // for tabs and stats
  const { activeBorrows, overdueBorrows, returnedBorrows } = useMemo(() => {
    const now = new Date(); 
    
    const active = borrows.filter((borrow) => !borrow.returned_at);
    const returned = borrows.filter((borrow) => !!borrow.returned_at);
    const overdue = active.filter(
      (borrow) => borrow.due_date && new Date(borrow.due_date) < now
  );

  return {
      activeBorrows: active,
      overdueBorrows: overdue,
      returnedBorrows: returned,
    };
  }, [borrows]);

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
          Monitor all active book loans, track overdue items, and manage returns across the library.
        </p>
      </div>

      {/* stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{borrows.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {activeBorrows.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Books</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {overdueBorrows.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Returned Books</CardTitle>
            <BookCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {returnedBorrows.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* for filter tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="all">
              All ({borrows.length})
            </TabsTrigger>
            <TabsTrigger value="active">
              Active ({activeBorrows.length})
            </TabsTrigger>
            <TabsTrigger value="overdue" className="data-[state=active]:text-destructive">
              Overdue ({overdueBorrows.length})
            </TabsTrigger>
            <TabsTrigger value="returned">
              Returned ({returnedBorrows.length})
            </TabsTrigger>
          </TabsList>

          {/* search */}
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

        {/* all borrows */}
        <TabsContent value="all">
          <AdminBorrowsTable
            borrows={borrows}
            onReturn={(id) => returnMutation.mutate(id)}
            search={search}
            isReturning={returnMutation.isPending}
            returningId={returnMutation.variables}
          />
        </TabsContent>

        {/* active borrows */}
        <TabsContent value="active">
          <AdminBorrowsTable
            borrows={activeBorrows}
            onReturn={(id) => returnMutation.mutate(id)}
            search={search}
            isReturning={returnMutation.isPending}
            returningId={returnMutation.variables}
          />
        </TabsContent>

        {/* overdue */}
        <TabsContent value="overdue">
          <AdminBorrowsTable
            borrows={overdueBorrows}
            onReturn={(id) => returnMutation.mutate(id)}
            search={search}
            isReturning={returnMutation.isPending}
            returningId={returnMutation.variables}
          />
        </TabsContent>

        {/* returned */}
        <TabsContent value="returned">
          <AdminBorrowsTable
            borrows={returnedBorrows}
            onReturn={(id) => returnMutation.mutate(id)}
            search={search}
            isReturning={returnMutation.isPending}
            returningId={returnMutation.variables}
          />
        </TabsContent>

      </Tabs>
    </div>
  )
}

export default AdminBorrowsPage
