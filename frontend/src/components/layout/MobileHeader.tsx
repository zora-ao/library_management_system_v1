import { useState } from "react";
import { Button } from "../ui/button";
import { BookOpen, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "../ui/sheet";
import { NavContent } from "./NavContent";

export const MobileHeader = () => {
  const [open, setOpen] = useState(false);

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:hidden sticky top-0 z-40">
      <div className="flex items-center gap-2.5">
        <img src="/Logo.png" alt="Pahina logo" className="h-7 w-7 shrink-0 object-contain" />
        <span className="font-semibold text-base tracking-tight">Pahina</span>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger>
          <Button variant="ghost" size="icon" aria-label="Open Navigation Menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="p-0 w-72 gap-0 bg-sidebar text-sidebar-foreground border-sidebar-border"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
          </SheetHeader>
          <NavContent onItemClick={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  );
};