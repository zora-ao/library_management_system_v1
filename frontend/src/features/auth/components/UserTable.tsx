import type React from "react";
import { useState } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  useUpdateUserRole,
  useUpdateUserActiveStatus,
  useAuth,
} from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
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
  const mutationToggleActive = useUpdateUserActiveStatus();
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

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          Failed to load users. Please confirm you have administrator permissions.
        </span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header Title */}
      <div className="border-b pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          User Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage system roles, account statuses, and system access rights.
        </p>
      </div>

      {/* Top Stat Containers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Total Users</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight">{totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Active Accounts</CardTitle>
            <UserCheck className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight">{activeCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-destructive">
              Deactivated / Inactive
            </CardTitle>
            <UserX className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight">{inactiveCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table Container Card */}
      <div className="rounded-lg border bg-card overflow-hidden">
        {/* Container Search Header */}
        <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pl-9"
            />
          </div>
          <p className="text-xs text-muted-foreground sm:self-center">
            Showing {filteredUsers.length} of {totalUsers} users
          </p>
        </div>

        {/* User Data Table */}
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="h-32">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Users className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        No users found
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {search
                          ? "Try a different search term."
                          : "No user accounts available."}
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  {/* User Profile Cell */}
                  <TableCell className="py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-border shrink-0">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="bg-leather/20 text-leather font-medium text-xs">
                          {user.username?.slice(0, 2).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-sm text-foreground truncate">
                          {user.username}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* System Role Select Cell */}
                  <TableCell className="py-3">
                    <Select
                      value={user.role}
                      disabled={
                        mutationUpdateRole.isPending &&
                        mutationUpdateRole.variables?.userId === String(user.id)
                      }
                      onValueChange={(val) => {
                        if (val) handleRoleChange(String(user.id), val);
                      }}
                    >
                      <SelectTrigger className="w-28 font-medium">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="librarian">Librarian</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Active Status Badge Cell */}
                  <TableCell className="py-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        "border-transparent",
                        user.is_active
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                      )}
                    >
                      {user.is_active ? "Active" : "Deactivated"}
                    </Badge>
                  </TableCell>

                  {/* Date Joined Cell */}
                  <TableCell className="py-3 text-sm text-muted-foreground whitespace-nowrap">
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
                          className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                        >
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Open options</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                          Account Control
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            mutationToggleActive.mutate({
                              userId: String(user.id),
                              isActive: !user.is_active,
                            })
                          }
                          disabled={
                            mutationToggleActive.isPending &&
                            mutationToggleActive.variables?.userId === String(user.id)
                          }
                          className={
                            user.is_active
                              ? "text-destructive focus:text-destructive"
                              : "text-success focus:text-success"
                          }
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
