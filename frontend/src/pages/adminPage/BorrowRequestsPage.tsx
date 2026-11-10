import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { CheckCircle2, Clock3, Inbox, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FilterSelect from "@/components/ui/FilterSelect";
import { LoadingState } from "@/components/ui/loading-spinner";
import BorrowRequestsTable from "@/features/borrows/components/BorrowRequestsTable";
import BorrowRequestDetailsSheet from "@/features/borrows/components/BorrowRequestDetailsSheet";
import ConfirmPickupDialog from "@/features/borrows/components/ConfirmPickupDialog";
import RejectBorrowRequestDialog from "@/features/borrows/components/RejectBorrowRequestDialog";
import {
  buildPendingQueue,
  classifyBorrowRequests,
  filterBorrowRequests,
  getQueuePositions,
  getBorrowRequestCounts,
  sortBorrowRequests,
  type BorrowRequestOrder,
  type BorrowRequestTab,
} from "@/features/borrows/lib/borrowRequestView";
import type { Borrow } from "@/features/borrows/types/borrow.types";
import { useAdminBorrows, useApproveBorrow, useConfirmBorrowPickup, useRejectBorrow } from "@/hooks/useBorrows";

const tabs: { value: BorrowRequestTab; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "pickup", label: "For Pickup" },
  { value: "rejected", label: "Rejected" },
];

export default function BorrowRequestsPage() {
  const { tab } = useParams();
  const activeTab = tabs.some((item) => item.value === tab) ? tab as BorrowRequestTab : null;
  const { data: borrows = [], isLoading, isError, error, refetch } = useAdminBorrows();
  const approve = useApproveBorrow();
  const reject = useRejectBorrow();
  const pickup = useConfirmBorrowPickup();
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("all");
  const [order, setOrder] = useState<BorrowRequestOrder>(() => activeTab === "rejected" ? "newest" : "oldest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Borrow | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [pickupOpen, setPickupOpen] = useState(false);

  const counts = useMemo(() => getBorrowRequestCounts(borrows), [borrows]);
  // Positions come from the whole queue, so they stay correct while searching or re-sorting.
  const queuePositions = useMemo(() => getQueuePositions(buildPendingQueue(borrows)), [borrows]);
  const rows = useMemo(() => {
    if (!activeTab) return [];
    const classified = classifyBorrowRequests(borrows, activeTab);
    const filtered = filterBorrowRequests(classified, search, date);
    const dateFor = activeTab === "pickup"
      ? (row: Borrow) => row.approved_at ?? row.created_at
      : (row: Borrow) => row.created_at;
    return sortBorrowRequests(filtered, order, dateFor);
  }, [activeTab, borrows, date, order, search]);

  if (!activeTab) return <Navigate to="/borrow-requests/pending" replace />;
  if (isLoading) return <LoadingState className="text-primary" containerClassName="h-72" label="Loading borrow requests" />;

  const openRow = (borrow: Borrow) => {
    setSelected(borrow);
    if (activeTab === "pickup") setPickupOpen(true);
    else setDetailsOpen(true);
  };
  const processing = approve.isPending || reject.isPending || pickup.isPending;

  return (
    <div className="space-y-7 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-sm">Borrow Requests</p><h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Borrow Requests</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">Review student requests, reserve available books, and confirm physical pickup before a loan begins.</p></div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Pending requests", value: counts.pending, hint: "Awaiting review", icon: Inbox },
          { label: "For pickup", value: counts.forPickup, hint: "Copies reserved", icon: Clock3 },
          { label: "Picked up today", value: counts.pickedUpToday, hint: "Loans started", icon: CheckCircle2 },
        ].map(({ label, value, hint, icon: Icon }) => <article key={label} className="rounded-3xl border border-border/70 bg-card p-5 shadow-[var(--glass-shadow)] backdrop-blur-xl"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-muted-foreground sm:text-base">{label}</p><p className="mt-2 text-2xl font-semibold sm:text-3xl">{value}</p><p className="mt-1 text-xs text-muted-foreground sm:text-sm">{hint}</p></div><span className="rounded-2xl bg-primary/10 p-3"><Icon className="size-5 text-primary" /></span></div></article>)}
      </section>

      <section className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-[var(--glass-shadow)] backdrop-blur-xl">
        <div className="border-b border-border px-5 pt-5">
          <nav className="flex gap-6" aria-label="Borrow request views">{tabs.map((item) => <Link key={item.value} to={`/borrow-requests/${item.value}`} onClick={() => { setPage(1); setOrder(item.value === "rejected" ? "newest" : "oldest"); }} className={`border-b-2 pb-3 text-sm font-semibold transition-colors sm:text-base ${activeTab === item.value ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{item.label}</Link>)}</nav>
        </div>
        <div className="flex flex-col gap-3 border-b border-border p-5 lg:flex-row lg:items-center">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search student, book, or request ID" className="h-10 bg-control pl-9 text-sm sm:text-base md:text-base" /></div>
          <Input aria-label="Request date" type="date" value={date === "all" ? "" : date} onChange={(event) => { setDate(event.target.value || "all"); setPage(1); }} className="h-10 bg-control text-sm sm:text-base md:text-base lg:w-44" />
          <FilterSelect
            label="Request ordering"
            value={order}
            onChange={(val) => { setOrder(val as BorrowRequestOrder); setPage(1); }}
            className="w-full sm:w-[150px]"
            options={[
              { value: "oldest", label: "Oldest first" },
              { value: "newest", label: "Newest first" },
            ]}
          />
        </div>
        {isError ? <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center"><p className="font-semibold text-destructive">Could not load borrow requests</p><p className="text-sm text-muted-foreground">{error?.message || "Please try again."}</p><Button variant="outline" onClick={() => refetch()}>Try again</Button></div> : <BorrowRequestsTable rows={rows} tab={activeTab} page={page} onPageChange={setPage} onOpen={openRow} queuePositions={activeTab === "pending" ? queuePositions : undefined} />}
      </section>

      <BorrowRequestDetailsSheet borrow={selected} open={detailsOpen} processing={processing} onOpenChange={setDetailsOpen} onApprove={(borrow) => approve.mutate(borrow.id, { onSuccess: () => setDetailsOpen(false) })} onReject={(borrow) => { setSelected(borrow); setDetailsOpen(false); setRejectOpen(true); }} />
      <RejectBorrowRequestDialog key={`${selected?.id ?? "none"}-${rejectOpen ? "open" : "closed"}`} borrow={selected} open={rejectOpen} processing={reject.isPending} onOpenChange={setRejectOpen} onConfirm={(reason) => selected && reject.mutate({ borrowId: selected.id, reason }, { onSuccess: () => setRejectOpen(false) })} />
      <ConfirmPickupDialog borrow={selected} open={pickupOpen} processing={pickup.isPending} onOpenChange={setPickupOpen} onConfirm={() => selected && pickup.mutate(selected.id, { onSuccess: () => setPickupOpen(false) })} />
    </div>
  );
}
