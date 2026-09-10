import { useState } from "react";
import { Button } from "../ui/button";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "../ui/sheet";
import { NavContent } from "./NavContent";

export const MobileHeader = () => {
  const [open, setOpen] = useState(false);

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:hidden sticky top-0 z-40">
      <span className="font-semibold text-lg tracking-tight">Library App</span>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger>
          <Button variant="ghost" size="icon" aria-label="Open Navigation Menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
          </SheetHeader>
          <NavContent onItemClick={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  );
};