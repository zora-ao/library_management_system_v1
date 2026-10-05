export type BorrowStatus = 
  | "PENDING_BORROW"
  | "BORROWED"
  | "PENDING_RETURN"
  | "RETURNED"
  | "REJECTED"
  | "OVERDUE";

export interface Borrow {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  book_id: string;
  book_title: string;
  book_image?: string;
  author?: string;
  borrowed_at: string | null;
  due_date: string | null;    
  returned_at: string | null;
  status: BorrowStatus;
  is_overdue: boolean;
  created_at?: string;
}

export interface CreateBorrowPayload {
  book_id: string;
}