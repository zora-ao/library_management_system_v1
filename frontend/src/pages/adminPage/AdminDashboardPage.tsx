import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetAllUsers } from "@/hooks/useAuth";
import { useAdminBorrows } from "@/hooks/useBorrows";
import { useBooks } from "@/hooks/useBooks";
import { useCategories } from "@/hooks/useCategories";
import {
  AlertCircle,
  BookCheck,
  BookOpen,
  Clock,
  Inbox,
  Layers,
  Loader2,
  Users,
} from "lucide-react";
import { useMemo } from "react";

const AdminDashboardPage = () => {
  const { data: users = [], isLoading: usersLoading } = useGetAllUsers();
  const { data: borrows = [], isLoading: borrowsLoading } = useAdminBorrows();
  const { data: books = [], isLoading: booksLoading } = useBooks();
  const { data: categories = [], isLoading: categoriesLoading } =
    useCategories();

  const isLoading =
    usersLoading || borrowsLoading || booksLoading || categoriesLoading;

  const stats = useMemo(() => {
    const now = new Date();

    const pending = borrows.filter((b) => b.status === "PENDING_BORROW");
    const active = borrows.filter(
      (b) => b.status === "BORROWED" || b.status === "PENDING_RETURN"
    );
    const overdue = borrows.filter(
      (b) =>
        b.status === "OVERDUE" ||
        (b.status === "BORROWED" && b.due_date && new Date(b.due_date) < now)
    );
    const returned = borrows.filter((b) => b.status === "RETURNED");

    const totalCopies = books.reduce(
      (sum, book) => sum + (book.total_copies ?? 0),
      0
    );
    const availableCopies = books.reduce(
      (sum, book) => sum + (book.available_copies ?? 0),
      0
    );

    return {
      totalUsers: users.length,
      totalBooks: books.length,
      totalCategories: categories.length,
      totalCopies,
      availableCopies,
      pending: pending.length,
      active: active.length,
      overdue: overdue.length,
      returned: returned.length,
    };
  }, [users, borrows, books, categories]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of library activity, catalog size, and account growth.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Total Books</CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight">
              {stats.totalBooks}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalCopies} copies · {stats.availableCopies} available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Total Users</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight">
              {stats.totalUsers}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Registered library accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">
              Categories
            </CardTitle>
            <Layers className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight">
              {stats.totalCategories}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Catalog organization
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">
              Pending Pickup
            </CardTitle>
            <Inbox className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight">
              {stats.pending}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting your approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">
              Active Loans
            </CardTitle>
            <Clock className="h-4 w-4 text-leather" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight">
              {stats.active}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Books currently out
            </p>
          </CardContent>
        </Card>

        <Card className="bg-destructive/10 ring-destructive/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-destructive">
              Overdue
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight text-destructive">
              {stats.overdue}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Past their due date
            </p>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">
              Returned Books
            </CardTitle>
            <BookCheck className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight">
              {stats.returned}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Completed loans across all time
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
