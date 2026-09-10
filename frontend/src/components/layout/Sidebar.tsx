import { cn } from "@/lib/utils";
import { NavContent } from "./NavContent";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  return (
    <aside
      className={cn(
        "relative hidden md:flex flex-col border-r bg-card transition-all duration-300 ease-in-out h-screen top-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <NavContent collapsed={collapsed} onToggle={onToggle} />
    </aside>
  );
};