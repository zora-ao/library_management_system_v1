import type React from "react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { confirmationDialogButtonClass, confirmationDialogContentClass, confirmationDialogDescriptionClass, confirmationDialogFooterClass, confirmationDialogTitleClass } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-spinner";
import FilterSelect from "@/components/ui/FilterSelect";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { filterAndSortUsers, getActiveLoansForUser, getUserSummary, type UserRoleFilter, type UserSort, type UserStatusFilter } from "@/features/auth/lib/userWorkspace";
import type { User, UserRole } from "@/features/auth/types/auth.types";
import { useAuth, useGetAllUsers, useUpdateUserActiveStatus, useUpdateUserRole } from "@/hooks/useAuth";
import { useAdminBorrows } from "@/hooks/useBorrows";
import { cn } from "@/lib/utils";
import { ArrowRight, BookOpen, CalendarDays, Search, ShieldAlert, UserRoundCheck, UserRoundCog, UserRoundX, UsersRound } from "lucide-react";

interface UserTableProps { roleFilter?: "librarian" | "student" }
const PAGE_SIZE = 6;
const ROLE_OPTIONS: Record<UserRole, string> = {
  student: "Student",
  librarian: "Librarian",
  admin: "Admin",
};
const roleLabel = (role: UserRole) => role.charAt(0).toUpperCase() + role.slice(1);
const formatDate = (date?: string | null) => date ? new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Not available";

const MetricCard = ({ label, value, icon: Icon, tone }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; tone: string }) => (
  <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-[var(--glass-shadow)] backdrop-blur-xl"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-muted-foreground sm:text-base">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">{value}</p></div><span className={cn("grid size-11 place-items-center rounded-2xl", tone)}><Icon className="size-5" /></span></div></div>
);

const UserTable: React.FC<UserTableProps> = ({ roleFilter }) => {
  const { user: currentUser } = useAuth();
  const usersQuery = useGetAllUsers();
  const borrowsQuery = useAdminBorrows();
  const updateRole = useUpdateUserRole();
  const updateStatus = useUpdateUserActiveStatus();
  const users = usersQuery.data ?? [];
  const borrows = borrowsQuery.data ?? [];
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserRoleFilter>(roleFilter ?? "all");
  const [status, setStatus] = useState<UserStatusFilter>("all");
  const [sort, setSort] = useState<UserSort>("newest");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roleTarget, setRoleTarget] = useState<User | null>(null);
  const [statusTarget, setStatusTarget] = useState<User | null>(null);
  const [roleDraft, setRoleDraft] = useState<UserRole>("student");
  const summary = getUserSummary(users);
  const filtered = filterAndSortUsers(users, { search, role, status, sort });
  const visibleUsers = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedLoans = selectedUser ? getActiveLoansForUser(selectedUser.id, borrows) : [];

  if (usersQuery.isLoading) return <LoadingState className="text-primary" containerClassName="h-64" label="Loading users" />;
  if (usersQuery.isError) return <div className="flex gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-5 text-sm text-destructive"><ShieldAlert className="size-5 shrink-0" />Failed to load users. Please confirm you have administrator permissions.</div>;

  const openRoleDialog = (user: User) => { setRoleDraft(user.role); setRoleTarget(user); };
  const isSelf = selectedUser && String(selectedUser.id) === String(currentUser?.id);

  return <div className="w-full space-y-7 pb-10">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-sm">Administration / People</p><h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">Users</h1><p className="mt-2 text-sm text-muted-foreground sm:text-base">Manage accounts, roles, and access to your library.</p></div>{currentUser && <p className="text-sm text-muted-foreground sm:text-base">Signed in as <span className="font-medium text-foreground">{currentUser.username}</span></p>}</header>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Total users" value={summary.totalUsers} icon={UsersRound} tone="bg-primary/10 text-primary" /><MetricCard label="Students" value={summary.students} icon={BookOpen} tone="bg-sky-500/10 text-sky-700" /><MetricCard label="Staff accounts" value={summary.staffAccounts} icon={UserRoundCog} tone="bg-amber-500/10 text-amber-700" /><MetricCard label="Inactive account" value={summary.inactiveAccounts} icon={UserRoundX} tone="bg-destructive/10 text-destructive" /></section>

    <section className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-[var(--glass-shadow)] backdrop-blur-xl">
      <div className="border-b border-border p-5"><h2 className="text-xl font-semibold sm:text-2xl">User directory</h2><p className="mt-1 text-sm text-muted-foreground sm:text-base">All registered library members.</p><div className="mt-5 flex flex-col gap-3 xl:flex-row"><label className="relative flex-1"><span className="sr-only">Search users</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name or email…" className="h-10 bg-control pl-9 text-sm sm:text-base" /></label><div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <FilterSelect
                label="Filter by role"
                value={role}
                onChange={(value) => { setRole(value as UserRoleFilter); setPage(1); }}
                options={[
                  { value: "all", label: "All roles" },
                  { value: "student", label: "Students" },
                  { value: "librarian", label: "Librarians" },
                  { value: "admin", label: "Admins" },
                ]}
              />
              <FilterSelect
                label="Filter by status"
                value={status}
                onChange={(value) => { setStatus(value as UserStatusFilter); setPage(1); }}
                options={[
                  { value: "all", label: "All statuses" },
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
              />
              <FilterSelect
                label="Sort users"
                value={sort}
                onChange={(value) => { setSort(value as UserSort); setPage(1); }}
                options={[
                  { value: "newest", label: "Newest first" },
                  { value: "oldest", label: "Oldest first" },
                  { value: "name", label: "Name A–Z" },
                ]}
              />
            </div></div></div>
      <div className="overflow-x-auto"><Table className="min-w-[860px] text-sm sm:text-base"><TableHeader><TableRow className="border-border bg-muted/60 hover:bg-muted/60"><TableHead className="pl-6">Member</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Active loans</TableHead><TableHead>Joined</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader><TableBody>
        {visibleUsers.length === 0 ? <TableRow><TableCell colSpan={6} className="h-44 text-center"><UsersRound className="mx-auto mb-3 size-8 text-muted-foreground" /><p className="text-sm font-medium sm:text-base">No users found</p><p className="mt-1 text-xs text-muted-foreground sm:text-sm">Try changing your search or filters.</p></TableCell></TableRow> : visibleUsers.map((user) => { const loans = getActiveLoansForUser(user.id, borrows); const overdue = loans.filter((loan) => loan.status === "OVERDUE" || loan.is_overdue).length; const self = String(user.id) === String(currentUser?.id); return <TableRow key={user.id} className="border-border/60 bg-card/30 hover:bg-muted/45"><TableCell className="py-4 pl-6"><div className="flex items-center gap-3"><Avatar className="size-10 border"><AvatarImage src={user.avatar_url || undefined} /><AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{user.username.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><div><p className="font-medium">{user.username}{self && " · You"}</p><p className="text-xs text-muted-foreground sm:text-sm">{user.email}</p></div></div></TableCell><TableCell><Badge variant="outline" className="rounded-full bg-background/60 text-xs sm:text-sm">{roleLabel(user.role)}</Badge></TableCell><TableCell><Badge variant="outline" className={cn("rounded-full border-transparent text-xs sm:text-sm", user.is_active ? "bg-emerald-500/10 text-emerald-700" : "bg-destructive/10 text-destructive")}>{user.is_active ? "Active" : "Inactive"}</Badge></TableCell><TableCell>{borrowsQuery.isError ? <span className="text-muted-foreground">—</span> : <div><span className="font-medium">{loans.length}</span>{overdue > 0 && <span className="ml-2 text-xs font-medium text-destructive sm:text-sm">{overdue} overdue</span>}</div>}</TableCell><TableCell className="text-xs text-muted-foreground sm:text-sm">{formatDate(user.created_at)}</TableCell><TableCell className="pr-6 text-right"><Button variant="ghost" size="sm" onClick={() => setSelectedUser(user)} aria-label={`View ${user.username} details`} className="rounded-full text-xs text-primary hover:text-primary sm:text-sm">View details <ArrowRight className="size-4" /></Button></TableCell></TableRow>; })}
      </TableBody></Table></div>
      <TablePagination page={page} pageSize={PAGE_SIZE} totalItems={filtered.length} itemLabel="users" onPageChange={setPage} />
    </section>

    <div className="rounded-[22px] border border-dashed border-primary/25 bg-primary/5 px-5 py-4"><p className="text-sm font-medium">Account access, handled with care</p><p className="mt-1 text-xs text-muted-foreground">Role and access changes take effect immediately. Review the member’s active loans before changing account access.</p></div>

    <Sheet open={Boolean(selectedUser)} onOpenChange={(open) => !open && setSelectedUser(null)}><SheetContent className="w-full overflow-y-auto bg-card/95 p-0 backdrop-blur-xl sm:max-w-[520px]">{selectedUser && <><SheetHeader className="border-b p-6"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary sm:text-sm">User profile</p><SheetTitle className="sr-only">User profile</SheetTitle><SheetDescription className="sr-only">Account and current loan details for {selectedUser.username}</SheetDescription></SheetHeader><div className="space-y-6 p-6"><div className="flex items-center gap-4"><Avatar className="size-16 border"><AvatarImage src={selectedUser.avatar_url || undefined} /><AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">{selectedUser.username.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><div><h2 className="text-xl font-semibold sm:text-2xl">{selectedUser.username}</h2><p className="text-sm text-muted-foreground sm:text-base">{selectedUser.email}</p><div className="mt-2 flex gap-2"><Badge variant="outline" className="text-xs sm:text-sm">{roleLabel(selectedUser.role)}</Badge><Badge variant="outline" className={cn("text-xs sm:text-sm", selectedUser.is_active ? "text-emerald-700" : "text-destructive")}>{selectedUser.is_active ? "Active" : "Inactive"}</Badge></div></div></div><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-muted/45 p-4"><CalendarDays className="mb-3 size-4 text-primary" /><p className="text-xs text-muted-foreground sm:text-sm">Member since</p><p className="mt-1 text-sm font-medium sm:text-base">{formatDate(selectedUser.created_at)}</p></div><div className="rounded-2xl bg-muted/45 p-4"><BookOpen className="mb-3 size-4 text-primary" /><p className="text-xs text-muted-foreground sm:text-sm">Active loans</p><p className="mt-1 text-sm font-medium sm:text-base">{borrowsQuery.isError ? "Unavailable" : selectedLoans.length}</p></div></div><div><h3 className="font-medium sm:text-lg">Current loans</h3>{borrowsQuery.isError ? <p className="mt-3 rounded-xl bg-destructive/10 p-4 text-sm text-destructive sm:text-base">Loan data is temporarily unavailable.</p> : selectedLoans.length ? <div className="mt-3 space-y-2">{selectedLoans.map((loan) => <div key={loan.id} className="flex items-center justify-between gap-3 rounded-xl border bg-background/50 p-3"><div><p className="text-sm font-medium sm:text-base">{loan.book_title}</p><p className="text-xs text-muted-foreground sm:text-sm">Due {formatDate(loan.due_date)}</p></div>{(loan.status === "OVERDUE" || loan.is_overdue) && <Badge variant="outline" className="border-transparent bg-destructive/10 text-xs text-destructive sm:text-sm">Overdue</Badge>}</div>)}</div> : <p className="mt-3 rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground sm:text-base">No active loans.</p>}</div>{isSelf ? <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground sm:text-base"><UserRoundCheck className="mb-2 size-5 text-primary" />This is your signed-in account.</div> : <div className="space-y-3 border-t pt-5"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:text-sm">Account management</p><Button variant="outline" className="w-full justify-start text-xs sm:text-sm" onClick={() => openRoleDialog(selectedUser)}>Change role</Button><Button variant={selectedUser.is_active ? "destructive" : "default"} className="w-full text-xs sm:text-sm" onClick={() => setStatusTarget(selectedUser)}>{selectedUser.is_active ? "Deactivate account" : "Activate account"}</Button></div>}</div></>}</SheetContent></Sheet>

    <Dialog open={Boolean(roleTarget)} onOpenChange={(open) => !open && setRoleTarget(null)}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Change user role</DialogTitle><DialogDescription>Choose the level of library access for {roleTarget?.username}.</DialogDescription></DialogHeader><div className="space-y-2 text-sm font-medium"><span>Account role</span><Select items={ROLE_OPTIONS} value={roleDraft} onValueChange={(value) => value !== null && setRoleDraft(value as UserRole)}><SelectTrigger aria-label="Account role" className="data-[size=default]:h-11 w-full rounded-xl bg-background px-3.5 text-sm font-medium shadow-sm hover:bg-accent/40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="student">Student</SelectItem><SelectItem value="librarian">Librarian</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select></div><p className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">Changing a role updates this user’s permissions immediately.</p><DialogFooter><Button variant="outline" onClick={() => setRoleTarget(null)}>Cancel</Button><Button disabled={updateRole.isPending || roleDraft === roleTarget?.role} onClick={() => roleTarget && updateRole.mutate({ userId: String(roleTarget.id), role: roleDraft }, { onSuccess: () => { setRoleTarget(null); setSelectedUser(null); } })}>{updateRole.isPending ? "Saving…" : "Save role"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(statusTarget)} onOpenChange={(open) => !open && setStatusTarget(null)}><DialogContent className={confirmationDialogContentClass}><DialogHeader><DialogTitle className={confirmationDialogTitleClass}>{statusTarget?.is_active ? `Deactivate ${statusTarget.username}’s account?` : `Activate ${statusTarget?.username}’s account?`}</DialogTitle><DialogDescription className={confirmationDialogDescriptionClass}>{statusTarget?.is_active ? "They will no longer be able to sign in until the account is activated again." : "They will regain access to their library account."}</DialogDescription></DialogHeader>{statusTarget && getActiveLoansForUser(statusTarget.id, borrows).length > 0 && <div className="rounded-xl border border-warning/30 bg-warning-soft p-4 text-sm leading-relaxed text-warning sm:text-base">This member has {getActiveLoansForUser(statusTarget.id, borrows).length} active loan(s). Their loan records will be preserved.</div>}<DialogFooter className={confirmationDialogFooterClass}><Button variant="outline" className={confirmationDialogButtonClass} onClick={() => setStatusTarget(null)}>Cancel</Button><Button className={confirmationDialogButtonClass} variant={statusTarget?.is_active ? "destructive" : "default"} disabled={updateStatus.isPending} onClick={() => statusTarget && updateStatus.mutate({ userId: String(statusTarget.id), isActive: !statusTarget.is_active }, { onSuccess: () => { setStatusTarget(null); setSelectedUser(null); } })}>{updateStatus.isPending ? "Saving…" : statusTarget?.is_active ? "Deactivate" : "Activate"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
};

export default UserTable;
