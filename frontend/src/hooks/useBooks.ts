import { createBook, deleteBook, getBooks, updateBook } from "@/features/books/api/books";
import type { BookFormData } from "@/features/books/types/book.schema";
import { type Book } from "@/features/books/types/book.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface BookUpdateProps {
  bookId: number;
  data: BookFormData
};

export const useBooks = () => {
  return useQuery<Book[]>({
    queryKey: ["books"],
    queryFn: getBooks,
    staleTime: 1000 * 60 * 5
  });
}

export const useCreateBooks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBook,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["books"]
      })
    }
  })
};

export const useUpdateBooks = () => {
  const queryClient = useQueryClient();


  return useMutation({
    mutationFn: ({
      bookId,
      data
    } : BookUpdateProps) => updateBook(bookId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["books"]
      })
    }
  });
};

export const useDeleteBooks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ( bookId: number ) => deleteBook(bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["books"]
      });
    }
  });
};
