import type { Book } from "../../types/book.types"

interface BookDetailsPageProps {
  book: Book;
};

const BookDetailsTable = ({ book }: BookDetailsPageProps) => {
  const details = [
    { label: "Book Title", value: book.title },
    { label: "Author", value: book.author },
    { label: "ISBN", value: book.isbn || "N/A" },
    { label: "Edition Language", value: "English" },
    { label: "Book Format", value: book.pages ? `Paperback, ${book.pages} pages` : "N/A" },
    {
      label: "Date Published",
      value: book.created_at
        ? new Date(book.created_at).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })
        : "N/A",
    },
  ];

  return (
    <div className="overflow-hidden w-[800px] mx-auto">
      {details.map((detail) => (
        <div
          key={detail.label}
          className="rounded grid grid-cols-3 border text-center p-3.5 text-xs bg-accent/10"
        >
          <span className="font-medium text-muted-foreground">{detail.label}</span>
          <span className="col-span-2 font-medium text-foreground">{detail.value}</span>
        </div>
      ))}
    </div>
  );
}

export default BookDetailsTable
