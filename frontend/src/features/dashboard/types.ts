import type { Borrow } from "@/features/borrows/types/borrow.types";

export interface DashboardActivity {
  date: string;
  loans: number;
  returns: number;
}

export interface DashboardSummary {
  total_users?: number;
  book_titles: number;
  total_copies: number;
  available_copies: number;
  categories: number;
  pending: number;
  waiting_for_pickup: number;
  active: number;
  overdue: number;
  returned: number;
  returned_today: number;
  attention: Borrow[];
  recent: Borrow[];
  activity: DashboardActivity[];
}
