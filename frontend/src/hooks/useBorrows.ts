import {
  approveBorrow,
  approveReturn,
  createBorrow,
  getAllBorrows,
  getBorrowHistory,
  getBorrows,
  rejectBorrow,
  returnBook,
} from "@/features/borrows/api/borrows";
import type { Borrow, CreateBorrowPayload } from "@/features/borrows/types/borrow.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";
export type { Borrow };


export const useBorrowHistory = () => {
  return useQuery({
    queryKey: ["borrows", "history"],
    queryFn: getBorrowHistory,
  });
};

export const useBorrows = () => {
  return useQuery({
    queryKey: ["borrows", "active"],
    queryFn: getBorrows,
  });
};

export const useCreateBorrows = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateBorrowPayload) => createBorrow(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["borrows"] });
      queryClient.invalidateQueries({ queryKey: ["books"] });
      toast.success("Borrow request submitted! Awaiting librarian approval.");
    },
    onError: (error: AxiosError<{ message: string }>) => {
      const errorMessage =
        error.response?.data?.message ||
        "Failed to request book borrow. Please try again.";
      toast.error(errorMessage);
    },
  });
};

export const useReturnBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (borrowId: string) => returnBook(borrowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["borrows"] });
      toast.success("Return request submitted. Please present the physical book to the library.");
    },
    onError: (error: AxiosError<{ message: string }>) => {
      const errorMessage =
        error.response?.data?.message || "Failed to submit return request.";
      toast.error(errorMessage);
    },
  });
};



export const useAdminBorrows = () => {
  return useQuery({
    queryKey: ["borrows", "admin"],
    queryFn: getAllBorrows,
  });
};

export const useApproveBorrow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (borrowId: string) => approveBorrow(borrowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["borrows"] });
      queryClient.invalidateQueries({ queryKey: ["books"] });
      toast.success("Borrow request approved successfully!");
    },
    onError: (error: AxiosError<{ message: string }>) => {
      const errorMessage =
        error.response?.data?.message || "Failed to approve borrow request.";
      toast.error(errorMessage);
    },
  });
};

export const useRejectBorrow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (borrowId: string) => rejectBorrow(borrowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["borrows"] });
      toast.success("Borrow request rejected.");
    },
    onError: (error: AxiosError<{ message: string }>) => {
      const errorMessage =
        error.response?.data?.message || "Failed to reject borrow request.";
      toast.error(errorMessage);
    },
  });
};

export const useApproveReturn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (borrowId: string) => approveReturn(borrowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["borrows"] });
      queryClient.invalidateQueries({ queryKey: ["books"] });
      toast.success("Book return confirmed successfully!");
    },
    onError: (error: AxiosError<{ message: string }>) => {
      const errorMessage =
        error.response?.data?.message || "Failed to confirm book return.";
      toast.error(errorMessage);
    },
  });
};