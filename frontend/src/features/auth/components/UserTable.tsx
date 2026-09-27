import type React from "react";
import { useState } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  useGetAllUsers,
  useUpdateUserRole, // Make sure to export this hook or update user status mutation
  useAuth,
} from "@/hooks/useAuth";
import {
  Loader2,
  Search,
  MoreVertical,
  Users,
  UserCheck,
  UserX,
  ShieldAlert,
} from "lucide-react";

const UserTable: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { data: users = [], isLoading, isError } = useGetAllUsers();
  const mutationUpdateRole = useUpdateUserRole();
  // const mutationUpdateStatus = useUpdateUserStatus(); // Hook to update active status
  const [search, setSearch] = useState("");

  // 1. Filter out the current logged-in admin from the list
  const managedUsers = users.filter(
    (user) => String(user.id) !== String(currentUser?.id)
  );

  // 2. Compute live metric totals
  const totalUsers = managedUsers.length;
  const activeCount = managedUsers.filter((u) => u.is_active).length;
  const inactiveCount = managedUsers.filter((u) => !u.is_active).length;

  // 3. Search filter logic
  const filteredUsers = managedUsers.filter(
    (user) =>
      user.username.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleRoleChange = (userId: string, newRole: string) => {
    mutationUpdateRole.mutate({ userId, role: newRole });
  };

  // const handleToggleStatus = (userId: string, currentStatus: boolean) => {
  //   mutationUpdateStatus.mutate({ userId, is_active: !currentStatus });
  // };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-xs font-medium text-stone-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-stone-700" />
        Loading account registry...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-600 font-medium">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        Failed to load users. Please confirm you have administrator permissions.
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 md:max-w-7xl mx-auto pb-12">
      {/* Header Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-stone-900">
          User Management
        </h2>
        <p className="text-xs text-stone-500 mt-1">
          Manage system roles, account statuses, and system access rights.
        </p>
      </div>

      {/* Top Stat Containers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center justify-between rounded-xl border p-4 shadow-2xs bg-white/50">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider">
              Total Users
            </p>
            <p className="text-2xl font-black ">{totalUsers}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-primary text-white">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border p-4 shadow-2xs bg-white/50">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider">
              Active Accounts
            </p>
            <p className="text-2xl font-black text-stone-900">{activeCount}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-primary text-white">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border  p-4 shadow-2xs bg-white/50">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-red-500 uppercase tracking-wider">
              Deactivated / Inactive
            </p>
            <p className="text-2xl font-black text-stone-900">{inactiveCount}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500">
            <UserX className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Table Container Card */}
      <div className="rounded-xl border border-stone-200 bg-white shadow-2xs overflow-hidden">
        {/* Container Search Header */}
        <div className="bg-primary p-4 border-b border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4 ">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <Input
              type="search"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white text-xs h-9 rounded-xl border-stone-200 focus:outline-none focus:border-stone-400"
            />
          </div>
          <p className="text-xs text-white font-medium self-end sm:self-center">
            Showing {filteredUsers.length} of {totalUsers} users
          </p>
        </div>

        {/* User Data Table */}
        <Table>
          <TableHeader className="bg-stone-50/8">
            <TableRow className="hover:bg-transparent border-stone-100">
              <TableHead className="text-xs font-bold uppercase text-foreground tracking-wider">
                User
              </TableHead>
              <TableHead className="text-xs font-bold uppercase text-foreground tracking-wider">
                Role
              </TableHead>
              <TableHead className="text-xs font-bold uppercase text-foreground tracking-wider">
                Status
              </TableHead>
              <TableHead className="text-xs font-bold uppercase text-foreground tracking-wider">
                Joined Date
              </TableHead>
              <TableHead className="text-xs font-bold uppercase text-foreground tracking-wider text-right pr-6">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-32 text-center text-xs text-stone-400"
                >
                  No user accounts found matching your query.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow
                  key={user.id}
                  className="border-stone-100 hover:bg-gray-50 transition-colors"
                >
                  {/* User Profile Cell */}
                  <TableCell className="py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-stone-200 shrink-0">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="bg-stone-100 text-stone-700 font-bold text-xs">
                          {user.username?.slice(0, 2).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-xs text-stone-900 truncate">
                          {user.username}
                        </span>
                        <span className="text-[11px] text-stone-500 truncate">
                          {user.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* System Role Select Cell */}
                  <TableCell className="py-3">
                    <Select
                      defaultValue={user.role}
                      disabled={
                        mutationUpdateRole.isPending &&
                        mutationUpdateRole.variables?.userId === String(user.id)
                      }
                      onValueChange={(val) => {
                        if (val) handleRoleChange(String(user.id), val);
                      }}
                    >
                      <SelectTrigger className="w-[110px] h-8 text-xs font-medium border-stone-200 bg-white">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent className="rounded-sm text-xs ">
                        <SelectItem value="student" className="focus:rounded-none">Student</SelectItem>
                        <SelectItem value="librarian" className="focus:rounded-none">Librarian</SelectItem>
                        <SelectItem value="admin" className="focus:rounded-none">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Active Status Badge Cell */}
                  <TableCell className="py-3">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                        user.is_active
                          ? "bg-white text-foreground border-primary"
                          : "bg-red-50 text-red-600 border-red-200"
                      }`}
                    >
                      {user.is_active ? "Active" : "Deactivated"}
                    </Badge>
                  </TableCell>

                  {/* Date Joined Cell */}
                  <TableCell className="py-3 text-xs text-stone-500 whitespace-nowrap">
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "N/A"}
                  </TableCell>

                  {/* Actions 3-Dot Dropdown */}
                  <TableCell className="py-3 text-right pr-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-stone-400 hover:text-stone-700 rounded-lg"
                        >
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Open options</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-40 rounded-xl text-xs"
                      >
                        <DropdownMenuLabel className="text-[10px] text-stone-400 uppercase tracking-wider">
                          Account Control
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          // onClick={() =>
                          //   handleToggleStatus(String(user.id), user.is_active)
                          // }
                          className={`cursor-pointer ${
                            user.is_active
                              ? "text-red-600 focus:text-red-600 focus:bg-red-50"
                              : "text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50"
                          }`}
                        >
                          {user.is_active ? "Deactivate User" : "Activate User"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default UserTable;