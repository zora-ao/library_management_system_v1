import { useAuth } from "@/hooks/useAuth";
import { Button } from "../ui/button";
import {
  BookmarkCheck,
  BookmarkIcon,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  DatabaseBackup,
  LayoutDashboard,
  Layers3,
  LogOut,
  RotateCcw,
  Settings,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import type React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface NavContentProps {
  collapsed?: boolean;
  onItemClick?: () => void; // Used to auto-close mobile drawer on link selection
  onToggle?: () => void;
}

interface NavChild {
  label: string;
  path: string;
  count?: number;
}

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  children?: NavChild[];
}

export const NavContent: React.FC<NavContentProps> = ({ collapsed = false, onItemClick, onToggle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Per-item override: absent key = follow the active route
  const [submenuOpenOverride, setSubmenuOpenOverride] = useState<Record<string, boolean>>({});

  const isAdmin = user?.role === "admin";
  const isStaff = isAdmin || user?.role === "librarian";

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleSettings = () => {
    onItemClick?.();
    navigate("/profile");
  };

  const handleProfileLogout = async () => {
    onItemClick?.();
    await handleLogout();
  };

  // Define navigation items directly per role
  const getNavItems = (): NavItem[] => {
    if (user?.role === "student") {
      return [
        { label: "Books", path: "/books", icon: BookOpen },
        { label: "My Borrows", path: "/my-borrows", icon: BookmarkCheck },
      ];
    }

    if (user?.role === "admin" || user?.role === "librarian") {
      const staffItems: NavItem[] = [
        { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
        {
          label: "Borrow Requests",
          path: "/borrow-requests",
          icon: BookmarkIcon,
          children: [
            { label: "Pending", path: "/borrow-requests/pending" },
            { label: "For Pickup", path: "/borrow-requests/pickup" },
            { label: "Rejected", path: "/borrow-requests/rejected" },
          ],
        },
        { label: "Loans & Returns", path: "/all-borrows/active", icon: RotateCcw },
        { label: "Books List", path: "/book-list", icon: BookOpen },
        { label: "Categories", path: "/categories", icon: Layers3 },
      ];

      if (isAdmin) {
        staffItems.push({
          label: "Users",
          path: "/users",
          icon: User,
        });
        staffItems.push({
          label: "Data Backups",
          path: "/backups",
          icon: DatabaseBackup,
        });
      }

      return staffItems;
    }

    return [];
  };

  const navItems = getNavItems();

  // A submenu is open when the user toggled it open, or when one of its routes is active
  const isSubmenuOpen = (itemPath: string) =>
    submenuOpenOverride[itemPath] ?? location.pathname.startsWith(itemPath);

  return (
    <div className="flex flex-col h-full">
      {/* Brand / Logo Header */}
      <div
        className={cn(
          "flex h-24 items-center justify-between shrink-0",
          collapsed ? "px-3" : "px-4"
        )}
      >
        <div className={cn("flex items-center gap-3 overflow-hidden", collapsed && "mx-auto")}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground font-bold">
            <img src="/pahina-logo.svg" alt="" width="40" height="40" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-lg whitespace-nowrap tracking-tight text-sidebar-foreground">
              Pahina
            </span>
          )}
        </div>
        {onToggle && !collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="shrink-0 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="size-5" />
          </Button>
        )}
      </div>

      {/* Expand control when collapsed */}
      {onToggle && collapsed && (
        <div className="p-2 border-b border-sidebar-border">
          <Button
            variant="ghost"
            onClick={onToggle}
            className="w-full h-8 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>
      )}

      {/* Links */}
      {!collapsed && user?.role !== "student" && (
        <p className="px-6 pb-3 text-[10px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
          Library workspace
        </p>
      )}

      <nav className="flex-1 space-y-1.5 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const hasChildren = !!item.children && !collapsed;

          if (hasChildren) {
            const submenuOpen = isSubmenuOpen(item.path);
            const isParentActive = location.pathname.startsWith(item.path);

            return (
              <div key={item.path} className="space-y-1">
                <div className="relative">
                  <NavLink
                    to={item.children?.[0]?.path ?? item.path}
                    onClick={onItemClick}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-full px-3 py-2.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-inset pr-9",
                        isActive || isParentActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )
                    }
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                  <button
                    type="button"
                    onClick={() =>
                      setSubmenuOpenOverride((prev) => ({ ...prev, [item.path]: !submenuOpen }))
                    }
                    aria-label={submenuOpen ? `Collapse ${item.label} menu` : `Expand ${item.label} menu`}
                    aria-expanded={submenuOpen}
                    className="absolute inset-y-0 right-1 my-auto flex h-7 w-7 items-center justify-center rounded-full text-sidebar-foreground transition-colors hover:bg-black/10 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                  >
                    <ChevronDown
                      className={cn("h-4 w-4 transition-transform duration-200", submenuOpen && "rotate-180")}
                    />
                  </button>
                </div>

                {submenuOpen && (
                  <ul className="mt-1 ml-5 space-y-1 border-l border-sidebar-border pl-3">
                    {item.children?.map((child) => (
                      <li key={child.path}>
                        <NavLink
                          to={child.path}
                          onClick={onItemClick}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center justify-between gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-inset",
                              isActive
                                ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
                                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            )
                          }
                        >
                          <span>{child.label}</span>
                          {child.count !== undefined && (
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                                "bg-sidebar-accent text-sidebar-foreground/70"
                              )}
                            >
                              {child.count}
                            </span>
                          )}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.children?.[0]?.path ?? item.path}
              onClick={onItemClick}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-full px-3 py-2.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-inset",
                  isActive || location.pathname.startsWith(item.path)
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "size-10 justify-center p-0 mx-auto rounded-xl"
                )
              }
              title={collapsed ? item.label : undefined}
              aria-label={collapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer User Info and Logout */}
      <div className="p-3 space-y-2 mt-auto">
        {!collapsed && user?.role !== "student" && (
          <p className="px-3 text-[9px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
            {user?.role === "admin" ? "Administrator" : "Librarian"}
          </p>
        )}
        {isStaff && user && (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`Account menu for ${user.username}`}
              openOnHover
              delay={0}
              closeDelay={150}
              className={cn(
                "flex w-full items-center rounded-md text-left transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                collapsed ? "justify-center p-1" : "gap-3 px-3 py-2",
              )}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={user.avatar_url} alt={user.username} />
                <AvatarFallback className="bg-leather/20 text-leather font-medium text-xs">
                  {user.username?.slice(0, 2).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-sidebar-foreground">{user.username}</p>
                  <p className="truncate text-xs capitalize text-muted-foreground">
                    {isAdmin ? "Administrator" : "Library staff"}
                  </p>
                </div>
              )}
              {!collapsed && (
                <ChevronDown
                  className="size-4 shrink-0"
                  aria-hidden="true"
                />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side={collapsed ? "right" : "top"}
              align={collapsed ? "end" : "start"}
              sideOffset={8}
              className="w-48"
            >
              <DropdownMenuItem onClick={handleSettings}>
                <Settings aria-hidden="true" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => void handleProfileLogout()}>
                <LogOut aria-hidden="true" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {!isStaff && !collapsed && user && (
          <NavLink
            to="/profile"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-sidebar-accent transition-colors"
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={user.avatar_url} alt={user.username} />
              <AvatarFallback className="bg-leather/20 text-leather font-medium text-xs">
                {user.username?.slice(0, 2).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user.username}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </NavLink>
        )}

        {!isStaff && (
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={cn(
              "w-full h-10 justify-start gap-3 rounded-md px-3 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
              collapsed && "justify-center px-0"
            )}
            title={collapsed ? "Logout" : undefined}
            aria-label="Logout"
          >
            <LogOut className="size-4 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </Button>
        )}
      </div>
    </div>
  );
};
