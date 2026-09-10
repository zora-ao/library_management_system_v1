import { useAuth } from "@/hooks/useAuth";
import { Button } from "../ui/button";
import { 
  BookAIcon, 
  BookmarkCheck, 
  BookmarkIcon, 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  LayoutDashboard, 
  LogOut, 
  User 
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import type React from "react";
import { cn } from "@/lib/utils";

interface NavContentProps {
  collapsed?: boolean;
  onItemClick?: () => void; // Used to auto-close mobile drawer on link selection
  onToggle?: () => void;
}

export const NavContent: React.FC<NavContentProps> = ({ collapsed = false, onItemClick, onToggle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Books Catalog", path: "/books", icon: BookOpen },
    { label: "My Borrows", path: "/my-borrows", icon: BookmarkCheck },
    ...(user?.role === "admin"
      ? [
          { label: "Borrowed Books", path: "/all-borrows", icon: BookmarkIcon },
          { label: "Manage Users", path: "/users", icon: User },
          { label: "Books List", path: "/book-list", icon: BookAIcon },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Brand / Logo Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          {!collapsed && (
            <>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                <BookOpen className="h-5 w-5" />
              </div>
              <span className="font-semibold text-lg whitespace-nowrap tracking-tight">
                Library
              </span>
            </>
          )}
        </div>
        {onToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-8 w-8 shrink-0 rounded-md hover:bg-accent"
            aria-label="Toggle sidebar"
          >
            {collapsed ? (
              <ChevronRight className="h-6 w-6" />
            ) : (
              <ChevronLeft className="h-6 w-6" />
            )}
          </Button>
        )}
      </div>

      {/* Links */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onItemClick}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  collapsed && "justify-center px-0"
                )
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer User Info and Logout */}
      <div className="border-t p-3 space-y-2 mt-auto">
        {!collapsed && user && (
          <div className="px-2 py-1.5 text-xs">
            <p className="font-medium text-foreground truncate">{user.username}</p>
            <p className="text-muted-foreground truncate">{user.email}</p>
          </div>
        )}

        <Button
          variant="outline"
          size={collapsed ? "icon" : "default"}
          onClick={handleLogout}
          className={cn("w-full justify-start gap-3", collapsed && "justify-center p-0")}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>
    </div>
  );
};