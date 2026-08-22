import { createBorrow, getBorrowHistory, getBorrows, returnBook } from "@/features/borrows/api/borrows"
import type { CreateBorrowPayload } from "@/features/borrows/types/borrow.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner";

export const useBorrowHistory = () => {
  return useQuery({
    queryKey: ['borrows'],
    queryFn: getBorrowHistory
  });
};

export const useBorrows = () => {
  return useQuery({
    queryKey: ["borrows"],
    queryFn: getBorrows
  });
};

export const useCreateBorrows = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateBorrowPayload) => createBorrow(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['borrows']
      });
      queryClient.invalidateQueries({
        queryKey: ['books']
      });
      toast.success("Book borrowed successfully!");
    },
    onError: () => {
      toast.error("Failed to borrow book")
    }
  });
};

export const useReturnBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (borrowId: string) => returnBook(borrowId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['borrows']
      });
      queryClient.invalidateQueries({
        queryKey: ['books']
      });
      toast.success("Book return successfully");
    },
    onError: () => {
      toast.error("Failed to return a book");
    }
  });
};