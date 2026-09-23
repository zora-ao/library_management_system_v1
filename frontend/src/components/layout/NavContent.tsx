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
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

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

  // Define navigation items directly per role
  const getNavItems = () => {
    if (user?.role === "student") {
      return [
        { label: "Books Catalog", path: "/books", icon: BookOpen },
        { label: "My Borrows", path: "/my-borrows", icon: BookmarkCheck },
      ];
    }

    if (user?.role === "admin" || user?.role === "librarian") {
      return [
        { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
        { label: "Borrowed Books", path: "/all-borrows", icon: BookmarkIcon },
        { label: "Manage Users", path: "/users", icon: User },
        { label: "Books List", path: "/book-list", icon: BookAIcon },
      ];
    }

    return [];
  };

  const navItems = getNavItems();

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
          <NavLink
            to="/profile"
            className="flex items-center gap-3 px-3 py-2 text-xs rounded-xl hover:bg-slate-100 transition-colors"
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={user.avatar_url} alt={user.username} />
              <AvatarFallback className="bg-purple-100 text-purple-700 font-semibold text-[10px]">
                {user.username?.slice(0, 2).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate">{user.username}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </NavLink>
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