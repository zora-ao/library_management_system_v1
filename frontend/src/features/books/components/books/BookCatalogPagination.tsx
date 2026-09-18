import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

interface BookPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  startIndex: number;
  itemsPerPage: number;
  totalItems: number;
}

const BookPagination = ({
  currentPage,
  totalPages,
  onPageChange,
  startIndex,
  itemsPerPage,
  totalItems,
}: BookPaginationProps) => {
  if (totalPages <= 1) return null;

  // Helper to construct a dynamic list of page numbers with ellipses
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis");

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push("ellipsis");
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100">
      <p className="text-xs text-slate-500">
        Showing
        <span className="font-semibold text-slate-700">{startIndex + 1}</span>{" "}
        to
        <span className="font-semibold text-slate-700">
          {Math.min(startIndex + itemsPerPage, totalItems)}
        </span>
        of <span className="font-semibold text-slate-700">{totalItems}</span>{" "}
        books
      </p>

      <Pagination className="justify-center sm:justify-end w-auto mx-0">
        <PaginationContent>
          {/* Previous Page Button */}
          <PaginationItem>
            <PaginationPrevious
              onClick={(e) => {
                e.preventDefault();
                if (currentPage > 1) onPageChange(currentPage - 1);
              }}
              className={
                currentPage === 1
                  ? "pointer-events-none opacity-50"
                  : "cursor-pointer"
              }
            />
          </PaginationItem>

          {/* Page Numbers */}
          {getPageNumbers().map((page, idx) =>
            page === "ellipsis" ? (
              <PaginationItem key={`ellipsis-${idx}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={page}>
                <PaginationLink
                  onClick={(e) => {
                    e.preventDefault();
                    onPageChange(page);
                  }}
                  isActive={currentPage === page}
                  className={`cursor-pointer ${
                    currentPage === page
                      ? "bg-purple-600 text-white hover:bg-purple-700 hover:text-white"
                      : ""
                  }`}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            )
          )}

          {/* Next Page Button */}
          <PaginationItem>
            <PaginationNext
              onClick={(e) => {
                e.preventDefault();
                if (currentPage < totalPages) onPageChange(currentPage + 1);
              }}
              className={
                currentPage === totalPages
                  ? "pointer-events-none opacity-50"
                  : "cursor-pointer"
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
};

export default BookPagination;