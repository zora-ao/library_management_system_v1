import { api } from "@/services/api";
import type { Borrow, CreateBorrowPayload } from "../types/borrow.types";

export const getAllBorrows = async (): Promise<Borrow[]> => {
  const { data } = await api.get("/borrows/admin/all");
  return Array.isArray(data) ? data : [];
};

export const getBorrowHistory = async (): Promise<Borrow[]> => {
  const { data } = await api.get("/borrows/history");
  return Array.isArray(data) ? data : data?.history || data?.data || [];
};

export const getBorrows = async (): Promise<Borrow[]> => {
  const { data } = await api.get("/borrows/me");
  return Array.isArray(data) ? data : data?.borrowed_books || [];
};

export const createBorrow = async (payload: CreateBorrowPayload): Promise<Borrow> => {
  const { data } = await api.post("/borrows", payload);
  return data.borrow || data;
};


export const approveBorrow = async (borrowId: string): Promise<Borrow> => {
  const { data } = await api.put(`/borrows/admin/${borrowId}/approve-borrow`);
  return data.borrow || data;
};


export const rejectBorrow = async (borrowId: string, reason: string): Promise<Borrow> => {
  const { data } = await api.put(`/borrows/admin/${borrowId}/reject-borrow`, { reason });
  return data.borrow || data;
};

export const confirmPickup = async (borrowId: string): Promise<Borrow> => {
  const { data } = await api.put(`/borrows/admin/${borrowId}/confirm-pickup`);
  return data.borrow || data;
};


export const approveReturn = async (borrowId: string): Promise<Borrow> => {
  const { data } = await api.put(`/borrows/admin/${borrowId}/approve-return`);
  return data.borrow || data;
};
