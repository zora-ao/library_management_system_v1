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
        "sticky top-0 hidden md:flex shrink-0 self-start flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out h-screen overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <NavContent collapsed={collapsed} onToggle={onToggle} />
    </aside>
  );
};
