import { LoadingState } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import type { BorrowStatus } from "@/features/borrows/types/borrow.types";
import type { DashboardSummary } from "@/features/dashboard/types";
import { useAuth } from "@/hooks/useAuth";
import { useDashboard } from "@/hooks/useDashboard";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowRight, BookOpen, CalendarDays, Clock3, Inbox, RotateCcw, UserRoundCog } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import BorrowingActivityChart from "./BorrowingActivityChart";

const STATUS_META: Record<BorrowStatus, { label: string; className: string; action: string }> = {
  PENDING_BORROW: { label: "Pending", className: "bg-warning-soft text-warning", action: "Review" },
  READY_FOR_PICKUP: { label: "For pickup", className: "bg-muted text-foreground", action: "Confirm pickup" },
  BORROWED: { label: "Borrowed", className: "bg-muted text-foreground", action: "View loan" },
  PENDING_RETURN: { label: "Return pending", className: "bg-warning-soft text-warning", action: "Record return" },
  RETURNED: { label: "Returned", className: "bg-success-soft text-success", action: "View loan" },
  REJECTED: { label: "Rejected", className: "bg-muted text-muted-foreground", action: "View request" },
  OVERDUE: { label: "Overdue", className: "bg-danger-soft text-danger", action: "View loan" },
};

const getBorrowDate = (borrow: DashboardSummary["recent"][number]) =>
  borrow.returned_at ?? borrow.borrowed_at ?? borrow.approved_at ?? borrow.created_at ?? borrow.due_date ?? "";

const formatCompactDate = (value: string | null | undefined) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));
};

const AdminDashboardPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: dashboard, isLoading, isError, refetch } = useDashboard();

  const now = useMemo(() => new Date(), []);

  if (isLoading) {
    return <LoadingState className="text-primary" containerClassName="min-h-[70vh]" label="Loading dashboard" />;
  }

  if (isError && !dashboard) {
    return (
      <div className="booky-empty min-h-[70vh]" role="alert">
        <h2>We couldn’t load the dashboard.</h2>
        <p>Please try again in a moment.</p>
        <Button type="button" onClick={() => void refetch()}>Try again</Button>
      </div>
    );
  }

  if (!dashboard) {
    return <LoadingState className="text-primary" containerClassName="min-h-[70vh]" label="Loading dashboard" />;
  }

  const activity = dashboard.activity.map((item) => {
    const [year, month, day] = item.date.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return {
      ...item,
      date,
      label: new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" }).format(date),
    };
  });

  const firstName = user?.username?.trim().split(/\s+/)[0] || "there";
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";
  const overviewItems = [
    ...(isAdmin && dashboard.total_users !== undefined ? [{ value: dashboard.total_users, label: "Total users" }] : []),
    { value: dashboard.book_titles, label: "Book titles" },
    { value: dashboard.total_copies, label: "Total copies" },
    { value: dashboard.available_copies, label: "Available copies" },
    { value: dashboard.categories, label: "Categories" },
    { value: dashboard.returned, label: "Returned · all time" },
  ];
  const statCards = [
    { label: "Pending requests", value: dashboard.pending, hint: "Awaiting your approval", icon: Inbox, tone: "bg-primary/10 text-primary" },
    { label: "Waiting for pickup", value: dashboard.waiting_for_pickup, hint: "Approved and ready", icon: Clock3, tone: "bg-primary/10 text-primary" },
    { label: "Active loans", value: dashboard.active, hint: `Includes ${dashboard.overdue} overdue ${dashboard.overdue === 1 ? "loan" : "loans"}`, icon: BookOpen, tone: "bg-primary/10 text-primary" },
    { label: "Overdue", value: dashboard.overdue, hint: "Follow up with the borrower", icon: AlertTriangle, tone: "bg-destructive/10 text-destructive" },
  ];

  return (
    <section className="w-full space-y-7 pb-10">
      <header className="space-y-7">
        <div className="flex items-center justify-between gap-4 text-sm font-bold uppercase tracking-[0.06em] text-muted-foreground sm:text-base">
          <span>Overview</span>
        </div>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="booky-heading text-3xl tracking-tight sm:text-4xl">{greeting}, {firstName}.</h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              {isAdmin ? "Monitor library operations, accounts, and the collection." : "Here’s what needs your attention at the library today."}
            </p>
          </div>
          <Link to={isAdmin ? "/users" : "/all-borrows/active"} className="booky-button h-11 shrink-0 px-6">
            {isAdmin ? <UserRoundCog className="size-4" /> : <RotateCcw className="size-4" />}
            {isAdmin ? "Manage users" : "Record return"}
            {isAdmin && <ArrowRight className="size-4" />}
          </Link>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, value, hint, icon: Icon, tone }) => (
          <article key={label} className="rounded-3xl border border-border/70 bg-card p-5 shadow-[var(--glass-shadow)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground sm:text-base">{label}</p>
                <p className="mt-2 text-2xl font-semibold sm:text-3xl">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{hint}</p>
              </div>
              <span className={cn("rounded-2xl p-3", tone)}><Icon className="size-5" /></span>
            </div>
          </article>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <section className="booky-glass min-w-0 p-4 sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-foreground sm:text-2xl">Needs attention</h2>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">Take care of urgent items first.</p>
            </div>
            <Link to="/borrow-requests/pending" className="booky-link shrink-0 text-sm sm:text-base">View all <ArrowRight className="ml-1 inline size-3" /></Link>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[620px]">
              <div className="grid grid-cols-[minmax(210px,2fr)_minmax(120px,1fr)_minmax(82px,auto)_minmax(140px,auto)] rounded-md bg-muted/70 px-3 py-2 text-sm font-bold uppercase tracking-wide text-muted-foreground sm:text-base">
                <span>Student / Book</span><span>Status</span><span>Date</span><span>Action</span>
              </div>
              {dashboard.attention.length > 0 ? dashboard.attention.map((borrow) => {
                const status = STATUS_META[borrow.status];
                return (
                  <div key={borrow.id} className="grid grid-cols-[minmax(210px,2fr)_minmax(120px,1fr)_minmax(82px,auto)_minmax(140px,auto)] items-center border-b border-border/70 px-3 py-3 last:border-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground sm:text-base">{borrow.user_name || "Library member"}</p>
                      <p className="mt-1 truncate text-sm text-muted-foreground sm:text-base">{borrow.book_title || "Untitled book"}</p>
                    </div>
                    <div><span className={cn("inline-flex min-w-24 rounded-full px-3 py-1.5 text-sm font-bold", status.className)}>{status.label}</span></div>
                    <span className="text-sm text-muted-foreground sm:text-base">{formatCompactDate(borrow.due_date ?? borrow.created_at)}</span>
                    <Link to={borrow.status === "PENDING_BORROW" ? "/borrow-requests/pending" : borrow.status === "READY_FOR_PICKUP" ? "/borrow-requests/pickup" : "/all-borrows/active"} className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-bold text-foreground sm:text-base">{status.action} <ArrowRight className="size-3 shrink-0" /></Link>
                  </div>
                );
              }) : <div className="py-12 text-center text-sm text-muted-foreground">Nothing needs attention right now.</div>}
            </div>
          </div>
        </section>

        <aside className="booky-glass flex flex-col p-4 sm:p-5">
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">Quick actions</h2>
          <div className="mt-3 space-y-2">
            {[["Review requests", "/borrow-requests/pending"], ["Record return", "/all-borrows/active"], ["Add book", "/book-list"]].map(([label, path]) => (
              <Link key={label} to={path} className="flex min-h-10 items-center justify-between rounded-lg bg-muted/70 px-3 text-sm font-bold text-foreground transition-colors hover:bg-accent sm:text-base">
                {label} <ArrowRight className="size-3.5" />
              </Link>
            ))}
          </div>
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-sm font-bold uppercase tracking-wide text-leather sm:text-base">Today at the desk</p>
            <div className="mt-2 flex items-center gap-3 text-heading">
              <strong className="text-2xl font-semibold tabular-nums sm:text-3xl">{dashboard.returned_today}</strong>
              <span className="text-sm text-muted-foreground sm:text-base">books returned today</span>
            </div>
            <Link to="/all-borrows/returned" className="booky-link mt-2 inline-flex items-center text-sm sm:text-base">View return history <ArrowRight className="ml-1 size-3" /></Link>
          </div>
        </aside>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <section className="booky-glass min-w-0 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="text-xl font-bold text-foreground sm:text-2xl">Borrowing activity</h2><p className="mt-1 text-sm text-muted-foreground sm:text-base">Loans and returns · last 7 days</p></div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground sm:text-base">
              <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-sm bg-foreground" />Loans</span>
              <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-sm bg-primary" />Returns</span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/70 px-3 py-2"><CalendarDays className="size-3" />7 days</span>
            </div>
          </div>
          <div className="mt-5 min-w-0">
            <BorrowingActivityChart activity={activity} />
          </div>
        </section>

        <section className="booky-glass p-4 sm:p-5">
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">Recent activity</h2>
          <div className="mt-4 space-y-4">
            {dashboard.recent.length > 0 ? dashboard.recent.map((borrow, index) => {
              const eventDate = getBorrowDate(borrow);
              const label = borrow.status === "RETURNED" ? "Book returned" : borrow.status === "PENDING_BORROW" ? "New request" : borrow.status === "BORROWED" ? "Book picked up" : STATUS_META[borrow.status].label;
              return (
                <div key={borrow.id} className="grid grid-cols-[8px_1fr_auto] items-start gap-3">
                  <span className={cn("mt-1.5 size-2 rounded-sm", index === 0 ? "bg-primary" : "bg-muted")} />
                  <div className="min-w-0"><p className="text-sm font-bold text-foreground sm:text-base">{label}</p><p className="mt-1 truncate text-sm text-muted-foreground sm:text-base">{borrow.book_title} · {borrow.user_name || "Library member"}</p></div>
                  <time className="text-sm text-muted-foreground">{eventDate ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(eventDate)) : "—"}</time>
                </div>
              );
            }) : <p className="py-8 text-center text-sm text-muted-foreground">No recent activity yet.</p>}
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-[var(--glass-shadow)]">
        <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground sm:text-base">Library overview</p>
        <div className={cn("mt-2 grid gap-4", isAdmin ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-6" : "grid-cols-2 md:grid-cols-5")}>
          {overviewItems.map((item) => (
            <div key={item.label} className="flex items-baseline gap-3"><strong className="text-2xl font-semibold tabular-nums sm:text-3xl">{item.value}</strong><span className="text-sm text-muted-foreground sm:text-base">{item.label}</span></div>
          ))}
        </div>
      </section>
    </section>
  );
};

export default AdminDashboardPage;
