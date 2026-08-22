export type BorrowStatus = "borrowed" | "returned" | "overdue";

export interface Borrow {
  id: string;
  book_id: string;
  user_id: string;
  book_title?: string;
  book_image?: string;
  author?: string;
  user_name?: string;
  borrowed_at: string;
  due_date: string;
  returned_at: string | null;
  status: BorrowStatus;
}

export interface CreateBorrowPayload {
  book_id: string;
  user_id?: string;
  due_date: string;
}
