import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import FilterSelect from "@/components/ui/FilterSelect";
import { LoadingState } from "@/components/ui/loading-spinner";
import AdminBorrowsTable from "@/features/borrows/components/AdminBorrowsTable";
import LoanDetailsDialog from "@/features/borrows/components/LoanDetailsDialog";
import RecordReturnDialog from "@/features/borrows/components/RecordReturnDialog";
import type { Borrow } from "@/features/borrows/types/borrow.types";
import {
  isActiveLoan,
  isLoanOverdue,
  isReturnedLoan,
  isSameLocalDay,
  matchesLoanSearch,
  returnOutcome,
  type ActiveLoanFilter,
  type LoanSort,
  type LoanWorkspaceMode,
  type ReturnOutcomeFilter,
} from "@/features/borrows/lib/loanView";
import { useAdminBorrows, useApproveReturn } from "@/hooks/useBorrows";
import { cn } from "@/lib/utils";

const countLabel = (value: number) => String(value).padStart(2, "0");

const AdminBorrowsPage = () => {
  const { data: borrows = [], isLoading, isError, error } = useAdminBorrows();
  const returnMutation = useApproveReturn();
  const { status } = useParams();
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);
  const mode: LoanWorkspaceMode = status === "returned" ? "history" : "active";
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveLoanFilter>(status === "overdue" ? "overdue" : "all");
  const [outcomeFilter, setOutcomeFilter] = useState<ReturnOutcomeFilter>("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sort, setSort] = useState<LoanSort>(mode === "history" ? "returned-desc" : "due-asc");
  const [detailsBorrow, setDetailsBorrow] = useState<Borrow | null>(null);
  const [returnBorrow, setReturnBorrow] = useState<Borrow | null>(null);

  const activeLoans = useMemo(() => borrows.filter(isActiveLoan), [borrows]);
  const returnedLoans = useMemo(() => borrows.filter(isReturnedLoan), [borrows]);
  const overdueLoans = useMemo(() => activeLoans.filter((borrow) => isLoanOverdue(borrow, today)), [activeLoans, today]);
  const dueToday = useMemo(() => activeLoans.filter((borrow) => isSameLocalDay(borrow.due_date, today)), [activeLoans, today]);
  const returnedToday = useMemo(() => returnedLoans.filter((borrow) => isSameLocalDay(borrow.returned_at, today)), [returnedLoans, today]);

  const visibleLoans = useMemo(() => {
    const source = mode === "active" ? activeLoans : returnedLoans;
    const filtered = source.filter((borrow) => {
      if (!matchesLoanSearch(borrow, search)) return false;
      if (mode === "active") {
        if (activeFilter === "overdue" && !isLoanOverdue(borrow, today)) return false;
        if (activeFilter === "due-today" && !isSameLocalDay(borrow.due_date, today)) return false;
        if (activeFilter === "borrowed" && borrow.status !== "BORROWED") return false;
        if (dateFilter === "today" && !isSameLocalDay(borrow.due_date, today)) return false;
        if (dateFilter === "overdue" && !isLoanOverdue(borrow, today)) return false;
      } else {
        const outcome = returnOutcome(borrow);
        if (outcomeFilter === "on-time" && outcome.tone !== "neutral") return false;
        if (outcomeFilter === "late" && outcome.tone !== "danger") return false;
        if (dateFilter === "today" && !isSameLocalDay(borrow.returned_at, today)) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      const aValue = sort.startsWith("returned") ? a.returned_at : a.due_date;
      const bValue = sort.startsWith("returned") ? b.returned_at : b.due_date;
      const difference = new Date(aValue || 0).getTime() - new Date(bValue || 0).getTime();
      return sort.endsWith("desc") ? -difference : difference;
    });
  }, [activeFilter, activeLoans, dateFilter, mode, outcomeFilter, returnedLoans, search, sort, today]);

  if (isLoading) return <LoadingState className="text-primary" containerClassName="min-h-[70vh]" label="Loading loan records" />;
  if (isError) return <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">Error loading loan records: {error?.message || "Could not load records"}</div>;

  const switchMode = (nextMode: LoanWorkspaceMode) => {
    setSearch("");
    setDateFilter("all");
    setActiveFilter("all");
    setOutcomeFilter("all");
    setSort(nextMode === "active" ? "due-asc" : "returned-desc");
    navigate(nextMode === "active" ? "/all-borrows/active" : "/all-borrows/returned");
  };

  const beginReturn = (borrow: Borrow) => {
    setDetailsBorrow(null);
    setReturnBorrow(borrow);
  };

  const confirmReturn = (borrow: Borrow) => {
    returnMutation.mutate(borrow.id);
    setReturnBorrow(null);
  };

  const summary = [
    { label: "Active loans", value: activeLoans.length, hint: "Includes overdue books", testId: "active-loans-count", featured: true },
    { label: "Overdue", value: overdueLoans.length, hint: "Needs your attention", testId: "overdue-count" },
    { label: "Due today", value: dueToday.length, hint: "Expected back today", testId: "due-today-count" },
    { label: "Returned today", value: returnedToday.length, hint: "Checked back into the library", testId: "returned-today-count" },
  ];

  return (
    <div className="w-full space-y-7 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-sm">Loans &amp; Returns</p><h1 className="booky-heading mt-3 text-2xl sm:text-3xl">Loans &amp; Returns</h1><p className="mt-2 text-sm text-muted-foreground sm:text-base">Track borrowed books, follow up on due dates, and record returns.</p></div>
      </header>

      <section className="grid w-full gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loan summary">
        {summary.map((item) => (
          <article key={item.label} className={cn("min-h-28 w-full rounded-3xl border p-5 shadow-[var(--glass-shadow)]", item.featured ? "border-primary/40 bg-primary/90 text-primary-foreground" : "border-border/70 bg-card")}>
            <p className={cn("text-xs font-bold sm:text-sm", item.featured ? "text-primary-foreground/75" : "text-muted-foreground")}>{item.label}</p>
            <strong data-testid={item.testId} className={cn("mt-1 block text-2xl text-heading sm:text-3xl", item.featured && "text-primary-foreground", item.label === "Overdue" && "text-danger")}>{countLabel(item.value)}</strong>
            <p className={cn("mt-1 text-xs sm:text-sm", item.featured ? "text-primary-foreground/75" : "text-muted-foreground")}>{item.hint}</p>
          </article>
        ))}
      </section>

      <section className="flex min-h-[570px] w-full flex-col overflow-hidden rounded-3xl border border-border/70 bg-card shadow-[var(--glass-shadow)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 border-b border-border px-5 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-6">
            <button type="button" onClick={() => switchMode("active")} className={cn("border-b-2 border-transparent pb-3 text-xs font-bold text-muted-foreground transition-colors sm:text-sm", mode === "active" && "border-primary text-foreground")}>Active Loans&nbsp; {activeLoans.length}</button>
            <button type="button" onClick={() => switchMode("history")} className={cn("border-b-2 border-transparent pb-3 text-xs font-bold text-muted-foreground transition-colors sm:text-sm", mode === "history" && "border-primary text-foreground")}>Return History&nbsp; {returnedLoans.length}</button>
          </div>
          <p className="pb-3 text-xs text-muted-foreground sm:text-sm">{mode === "active" ? "Overdue loans appear first" : "Most recent returns first"}</p>
        </div>

        <div className="grid gap-3 border-b border-border p-5 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_180px_150px_190px]">
          <label className="relative"><span className="sr-only">Search loans</span><Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" /><Input type="search" className="h-11 border-0 bg-control pl-10 text-sm sm:text-base md:text-base" placeholder="Search student, book title, or loan ID" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <div>
            {mode === "active" ? (
              <FilterSelect
                label="Loan status"
                value={activeFilter}
                onChange={(val) => setActiveFilter(val as ActiveLoanFilter)}
                options={[
                  { value: "all", label: "All active loans" },
                  { value: "overdue", label: "Overdue" },
                  { value: "due-today", label: "Due today" },
                  { value: "borrowed", label: "Borrowed" },
                ]}
              />
            ) : (
              <FilterSelect
                label="Return outcome"
                value={outcomeFilter}
                onChange={(val) => setOutcomeFilter(val as ReturnOutcomeFilter)}
                options={[
                  { value: "all", label: "All returns" },
                  { value: "on-time", label: "On time" },
                  { value: "late", label: "Returned late" },
                ]}
              />
            )}
          </div>
          <div>
            <FilterSelect
              label="Date filter"
              value={dateFilter}
              onChange={(val) => setDateFilter(val)}
              options={[
                { value: "all", label: mode === "active" ? "Due date" : "Return date" },
                { value: "today", label: "Today" },
                ...(mode === "active" ? [{ value: "overdue", label: "Overdue" }] : []),
              ]}
            />
          </div>
          <div>
            <FilterSelect
              label="Sort loans"
              value={sort}
              onChange={(val) => setSort(val as LoanSort)}
              options={
                mode === "active"
                  ? [
                      { value: "due-asc", label: "Due date: earliest" },
                      { value: "due-desc", label: "Due date: latest" },
                    ]
                  : [
                      { value: "returned-desc", label: "Newest first" },
                      { value: "returned-asc", label: "Oldest first" },
                    ]
              }
            />
          </div>
        </div>

        <AdminBorrowsTable borrows={visibleLoans} mode={mode} today={today} onViewDetails={setDetailsBorrow} onRecordReturn={beginReturn} isProcessing={returnMutation.isPending} processingId={(returnMutation.variables as string | undefined) ?? null} />
      </section>

      <p className="text-xs text-muted-foreground sm:text-sm">{mode === "active" ? "Record a return only after receiving the physical book from the student." : "Returned books remain in the history for your records."}</p>

      <LoanDetailsDialog borrow={detailsBorrow} open={!!detailsBorrow} today={today} onOpenChange={(open) => !open && setDetailsBorrow(null)} onRecordReturn={beginReturn} />
      <RecordReturnDialog borrow={returnBorrow} open={!!returnBorrow} today={today} isPending={returnMutation.isPending} onOpenChange={(open) => !open && setReturnBorrow(null)} onConfirm={confirmReturn} />
    </div>
  );
};

export default AdminBorrowsPage;
