import { Book, Calendar, Clock, Bookmark, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const LibrarySidebar = () => {
  return (
    <aside className="space-y-6">
      
      {/* 1. Active Loans Widget */}
      <div className="bg-card border rounded-2xl p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              My Active Loans (1/3)
            </h4>
          </div>
          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 bg-amber-50">
            Due in 2 days
          </Badge>
        </div>

        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 border">
          <div className="h-12 w-9 bg-zinc-200 rounded overflow-hidden shrink-0">
            <div className="h-full w-full flex items-center justify-center bg-zinc-800 text-white font-bold text-[9px]">
              REACT
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-foreground truncate">The Road to React</p>
            <p className="text-[11px] text-muted-foreground">Borrowed: Aug 15</p>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-[10px] px-2">
            Renew
          </Button>
        </div>
      </div>

      {/* 2. Library Status & Hours */}
      <div className="bg-card border rounded-2xl p-4 space-y-2 shadow-sm">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 font-semibold text-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Main Library Open
          </span>
          <span className="text-muted-foreground text-[11px]">Closes 8:00 PM</span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Study Hall Capacity: <strong className="text-foreground">42% (Seats Available)</strong>
        </p>
      </div>

      {/* 3. Quick Saved Queue */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
            <Bookmark className="h-3.5 w-3.5 text-primary" /> Saved For Later
          </h4>
          <button className="text-[11px] text-emerald-600 hover:underline font-medium">
            Manage
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border text-xs">
            <span className="font-semibold text-foreground truncate max-w-[150px]">
              Clean Code
            </span>
            <Badge variant="secondary" className="text-[10px] font-normal">
              In Stock
            </Badge>
          </div>
        </div>
      </div>

    </aside>
  );
};