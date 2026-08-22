import { api } from "@/services/api";
import type { Borrow, CreateBorrowPayload } from "../types/borrow.types";

export const getBorrowHistory = async(): Promise<Borrow[]> => {
  const { data } = await api.get("/borrows/history");

  return Array.isArray(data) ? data : [];
}

export const getBorrows = async(): Promise<Borrow[]> => {
  const { data } = await api.get("/borrows/me");


  return Array.isArray(data) ? data : data.borrowed_books || [];
};


export const createBorrow = async(payload: CreateBorrowPayload): Promise<Borrow> => {
  const { data } = await api.post("/borrows", payload);

  return data.borrow || data;
};

export const returnBook =  async(borrowId: string): Promise<Borrow> => {
  const { data } = await api.put(`/borrows/${borrowId}/return`);

  return data.borrow || data;
};