import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface FooterProps {
  libraryName?: string;
  className?: string;
}

export const Footer = ({
  libraryName = "Library Management System",
  className,
}: FooterProps) => {
  const year = new Date().getFullYear();

  return (
    <footer
      className={cn(
        "shrink-0 border-t border-border bg-secondary px-4 py-3 md:px-6",
        className
      )}
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:justify-between sm:gap-8">
        
        <div className="w-full space-y-2 flex">
          <div className="w-[300px] flex items-center gap-2 text-primary">
            <BookOpen className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="text-sm font-semibold leading-5 tracking-tight">{libraryName}</span>
          </div>
          <p className="pl-30 w-full text-sm font-normal leading-5 text-muted-foreground">
            Discover books, manage borrowing, and keep your library connected.
          </p>
          <nav>
            <Link
              to="/about"
              className="pr-4 text-sm font-medium leading-5 text-primary transition-colors hover:text-primary-hover"
            >
              About
            </Link>
          </nav>
        </div>
      </div>
      <div className="mt-0 border-t border-border pt-4">
        <p className="text-center text-xs font-medium leading-5 text-muted-foreground">
          © {year} {libraryName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
};
