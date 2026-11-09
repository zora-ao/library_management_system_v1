import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingState } from "@/components/ui/loading-spinner";
import { useBorrowHistory, useBorrows } from "@/hooks/useBorrows";
import { borrowState, filterBorrows, formatBorrowDate, summarizeBorrows } from "@/features/borrows/borrow-view";
import BorrowSelect from "@/features/borrows/components/BorrowSelect";
import "./my-borrows.css";

const statusOptions = [
  { value: "all", label: "All statuses" }, { value: "borrowed", label: "Borrowed" },
  { value: "soon", label: "Due soon" }, { value: "overdue", label: "Overdue" },
  { value: "pending", label: "Awaiting approval" }, { value: "ready", label: "Ready for pickup" },
];
// Returns are recorded by staff at the library desk, so students only see
// request-stage filters while they have a request in progress.
const requestStatusFilters = ["pending", "ready"];
const activeSort = [{ value: "due", label: "Due date: nearest first" }, { value: "borrowed", label: "Recently borrowed" }, { value: "title", label: "Book title: A–Z" }];
const historySort = [{ value: "returned", label: "Recently returned" }, { value: "borrowed", label: "Recently borrowed" }, { value: "title", label: "Book title: A–Z" }];
const periodOptions = [{ value: "all", label: "All time" }, { value: "month", label: "This month" }, { value: "quarter", label: "Last 3 months" }, { value: "year", label: "This year" }];

export default function MyBorrowsPage() {
  const active = useBorrows();
  const history = useBorrowHistory();
  const [searchParams, setSearchParams] = useSearchParams();
  const paramTab = searchParams.get("tab");
  const tab = paramTab === "history" ? "history" : "active";
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [period, setPeriod] = useState("all");
  const [sort, setSort] = useState(() => (tab === "history" ? "returned" : "due"));
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60000); return () => window.clearInterval(timer); }, []);
  // Reset filters when the tab changes (also via the URL), during render rather
  // than in an effect, so the page does not render twice.
  const [filtersTab, setFiltersTab] = useState(tab);
  if (filtersTab !== tab) {
    setFiltersTab(tab);
    setQuery("");
    setStatus("all");
    setPeriod("all");
    setSort(tab === "history" ? "returned" : "due");
  }
  const isHistory = tab === "history";
  const current = isHistory ? history : active;
  const records = current.data ?? [];
  const summary = summarizeBorrows(active.data ?? [], history.data ?? [], now);
  const visible = filterBorrows(records, { query, status, period, sort, history: isHistory }, now);
  const pending = (active.data ?? []).some(b => b.status === "PENDING_BORROW" || b.status === "READY_FOR_PICKUP");
  const rejected = (history.data ?? []).some(b => b.status === "REJECTED");
  const cards = [
    { label: "Currently borrowed", value: summary.borrowed, note: "Books still with you", kind: "", source: active },
    { label: "Due soon", value: summary.soon, note: "Return within 3 days", kind: "soon", source: active },
    { label: "Overdue", value: summary.overdue, note: "Please return to the library", kind: "overdue", source: active },
    { label: "Returned", value: summary.returned, note: "Your reading so far", kind: "", source: history },
  ];
  return <div className="my-borrows">
    <header className="borrows-heading"><p>YOUR LIBRARY ACTIVITY</p><h1>My Borrows</h1><span>Your reading journey, all in one place.</span></header>
    <div className="borrows-summary">{cards.map(card => <section key={card.label} className={`borrows-stat ${card.kind}`} aria-label={card.label}>
      <h2>{card.label}</h2><strong>{card.source.isLoading || card.source.isError ? "—" : String(card.value).padStart(2, "0")}</strong><p>{card.note}</p>
    </section>)}</div>
    <Tabs value={tab} onValueChange={value => { setSearchParams(value === "history" ? { tab: "history" } : { tab: "active" }); }} className="borrows-tabs">
      <TabsList variant="line" className="borrows-tab-list">
        <TabsTrigger value="active">Active Borrows{active.data && ` (${active.data.length})`}</TabsTrigger>
        <TabsTrigger value="history">Borrowing History{history.data && ` (${history.data.length})`}</TabsTrigger>
      </TabsList>
      {["active", "history"].map(value => <TabsContent key={value} value={value} className="borrows-tab-content">
        <div className="borrows-controls">
          <label className="borrows-search"><Search size={15} aria-hidden="true" /><input type="search" aria-label={isHistory ? "Search your borrowing history" : "Search your borrowed books"} placeholder={isHistory ? "Search your borrowing history" : "Search your borrowed books"} value={query} onChange={event => setQuery(event.target.value)} /></label>
          <BorrowSelect label={isHistory ? "History period" : "Borrow status"} value={isHistory ? period : status} options={isHistory ? periodOptions : statusOptions.filter(option => pending || option.value === status || !requestStatusFilters.includes(option.value))} onChange={isHistory ? setPeriod : setStatus} />
          <BorrowSelect label="Sort borrows" value={sort} options={isHistory ? historySort : activeSort} onChange={setSort} />
        </div>
        <div className="borrows-result-info"><p aria-live="polite">{current.isLoading ? "Loading your books…" : current.isError ? "Records unavailable" : isHistory ? `Showing ${visible.length} of ${records.length} ${rejected ? "history records" : "returned books"}` : `${visible.length} active ${visible.length === 1 ? "book" : "books"}`}</p><p>{sort === "due" ? "Overdue books appear first" : sort === "title" ? "Sorted by book title" : sort === "returned" ? "Most recent returns first" : "Most recently borrowed first"}</p></div>
        {current.isLoading ? <LoadingState containerClassName="borrows-empty" label="Loading your borrows" /> : current.isError ? <div className="borrows-empty" role="alert"><h2>We couldn’t load your borrows.</h2><p>Please try again in a moment.</p><button type="button" onClick={() => void current.refetch()}>Try again</button></div> : visible.length ? <div className="borrows-table-scroll"><table className="borrows-table">
          <thead><tr><th>BOOK</th><th>BORROWED</th><th>{isHistory ? "RETURNED" : "DUE DATE"}</th><th>STATUS</th></tr></thead>
          <tbody>{visible.map(borrow => { const state = borrowState(borrow, now); return <tr key={borrow.id}>
            <td><Link to={`/books/${borrow.book_id}`} className="borrows-book">{borrow.book_image ? <img src={borrow.book_image} alt={`${borrow.book_title} cover`} /> : <span className="borrows-cover" aria-hidden="true">{borrow.book_title.split(/\s+/).slice(0, 3).join("\n")}</span>}<span><strong>{borrow.book_title || "Unknown book"}</strong><span>{borrow.author || "Unknown author"}</span></span></Link></td>
            <td data-label="Borrowed">{formatBorrowDate(borrow.borrowed_at)}</td><td data-label={isHistory ? "Returned" : "Due date"}>{formatBorrowDate(isHistory ? borrow.returned_at : borrow.due_date)}</td><td data-label="Status"><span className={`borrows-badge ${state.kind}`}>{state.label}</span></td>
          </tr>; })}</tbody>
        </table></div> : <div className="borrows-empty"><h2>{records.length ? "No books match your search." : isHistory ? "Your reading history starts here." : "No active borrows yet."}</h2><p>{records.length ? "Try a different title, author, or filter." : "Explore the catalog to find your next read."}</p>{records.length ? <button type="button" onClick={() => { setQuery(""); setStatus("all"); setPeriod("all"); }}>Clear filters</button> : <Link to="/books">Browse books →</Link>}</div>}
        <aside className="borrows-guidance"><h2>{isHistory ? "Your reading history" : "Ready to return a book?"}</h2><p>{isHistory ? "Books appear here once a librarian confirms their return. Find your next read in the catalog." : "Bring it to the library desk. Your librarian will confirm the return and update your borrowing history."}</p></aside>
      </TabsContent>)}
    </Tabs>
  </div>;
}
