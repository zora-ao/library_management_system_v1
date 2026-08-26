import { useAuth } from "@/hooks/useAuth"
import { Button } from "../ui/button";
import { BookA, BookAIcon, BookmarkCheck, BookmarkIcon, BookOpen, ChevronLeft, ChevronRight, History, LayoutDashboard, LogOut, User } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import type React from "react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const Navbar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async() => {
    await logout();
    navigate("/login");
  };

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Books Catalog", path: "/books", icon: BookOpen },
    { label: "My Borrows", path: "/my-borrows", icon: BookmarkCheck },
    ...(user?.role == "admin"
      ? [
        { label: "Borrowed Books", path: "/all-borrows", icon: BookmarkIcon },
        { label: "Manage User", path: "/users", icon: User },
        { label: "Books List", path: "/book-list", icon: BookAIcon }
      ]
      : []
    ),
  ];

  return (
    <aside
      className={cn(
          "relative flex flex-col border-r bg-card transition-all duration-300 ease-in-out h-screen top-0",
          collapsed ? "w-16" : "w-64"
        )}
    >

      {/* Brand / Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            <BookOpen className="h-5 w-5" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-lg whitespace-nowrap tracking-tight">
              Library
            </span>
          )}
        </div>

        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8 rounded-full hidden md:flex"
          aria-label="Toggle sidebar"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
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
      <div className="border-t p-3 space-y-2">
        {!collapsed && user && (
          <div className="px-2 py-1.5 text-xs">
            <p className="font-medium text-foreground truncate">
              {user.username}
            </p>
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
    </aside>
  )
}

export default Navbar
