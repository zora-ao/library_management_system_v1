import {
  approveBorrow,
  approveReturn,
  confirmPickup,
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

const BORROW_STATUS_STALE_TIME_MS = 15 * 1000;
type BorrowQueryScope = "active" | "history" | "admin";

const invalidateBorrowData = (
  queryClient: ReturnType<typeof useQueryClient>,
  scopes: BorrowQueryScope[],
) => {
  scopes.forEach((scope) => {
    queryClient.invalidateQueries({ queryKey: ["borrows", scope] });
  });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
};

const invalidateBookAvailability = (
  queryClient: ReturnType<typeof useQueryClient>,
  bookId?: string,
) => {
  queryClient.invalidateQueries({ queryKey: ["books"] });
  if (bookId) {
    queryClient.invalidateQueries({ queryKey: ["book", bookId] });
  }
};

export const useBorrowHistory = () => {
  return useQuery({
    queryKey: ["borrows", "history"],
    queryFn: getBorrowHistory,
    staleTime: BORROW_STATUS_STALE_TIME_MS,
    refetchOnWindowFocus: true,
  });
};

export const useBorrows = () => {
  return useQuery({
    queryKey: ["borrows", "active"],
    queryFn: getBorrows,
    staleTime: BORROW_STATUS_STALE_TIME_MS,
    refetchOnWindowFocus: true,
  });
};

export const useCreateBorrows = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateBorrowPayload) => createBorrow(payload),
    onSuccess: () => {
      invalidateBorrowData(queryClient, ["active", "admin"]);
      toast.success("Borrow request submitted! Waiting for librarian approval.");
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
      invalidateBorrowData(queryClient, ["active", "admin"]);
      toast.success("Return request submitted. Please bring the physical book to the library.");
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
    staleTime: BORROW_STATUS_STALE_TIME_MS,
    refetchOnWindowFocus: true,
  });
};

export const useApproveBorrow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (borrowId: string) => approveBorrow(borrowId),
    onSuccess: (borrow) => {
      invalidateBorrowData(queryClient, ["active", "admin"]);
      invalidateBookAvailability(queryClient, borrow.book_id);
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
    mutationFn: ({ borrowId, reason }: { borrowId: string; reason: string }) =>
      rejectBorrow(borrowId, reason),
    onSuccess: () => {
      invalidateBorrowData(queryClient, ["active", "history", "admin"]);
      toast.success("Borrow request rejected.");
    },
    onError: (error: AxiosError<{ message: string }>) => {
      const errorMessage =
        error.response?.data?.message || "Failed to reject borrow request.";
      toast.error(errorMessage);
    },
  });
};

export const useConfirmBorrowPickup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (borrowId: string) => confirmPickup(borrowId),
    onSuccess: () => {
      invalidateBorrowData(queryClient, ["active", "admin"]);
      toast.success("Pickup confirmed. The 14-day loan has started.");
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to confirm book pickup.");
    },
  });
};

export const useApproveReturn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (borrowId: string) => approveReturn(borrowId),
    onSuccess: (borrow) => {
      invalidateBorrowData(queryClient, ["active", "history", "admin"]);
      invalidateBookAvailability(queryClient, borrow.book_id);
      toast.success("Book return confirmed successfully!");
    },
    onError: (error: AxiosError<{ message: string }>) => {
      const errorMessage =
        error.response?.data?.message || "Failed to confirm book return.";
      toast.error(errorMessage);
    },
  });
};
