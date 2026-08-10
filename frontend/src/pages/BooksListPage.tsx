import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import BookFormModal from "@/features/books/components/BookFormModal";
import { useState } from "react"

const BooksListPage = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Book Catalog</h1>
        <Button onClick={() => setIsOpen(true)}>
          Add Book
        </Button>
      </div>

      <BookFormModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  )
}

export default BooksListPage
