import { createBook, deleteBook, getBookById, getBooks, updateBook } from "@/features/books/api/books";
import type { BookFormData } from "@/features/books/types/book.schema";
import { type Book } from "@/features/books/types/book.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface BookUpdateProps {
  bookId: string;
  data: BookFormData
}; 

export const useBooks = (categoryId?: string) => {
  return useQuery<Book[]>({
    queryKey: ["books", categoryId],
    queryFn: () => getBooks(categoryId),
    staleTime: 1000 * 60 * 5
  });
}

export const useGetBookById = (bookId: string | undefined) => {

  return useQuery<Book>({
    queryKey: ['book', bookId],
    queryFn: () => getBookById(bookId!),
    enabled: !!bookId,
  });
};

export const useCreateBooks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBook,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["books"]
      });
      toast.success("Book added successfully")
    },
    onError: () => {
      toast.error("Failed to add book")
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
      });
      toast.success("Book updated successfully")
    },
    onError: () => {
      toast.error("Failed to update book")
    }
  });
};

export const useDeleteBooks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ( bookId: string ) => deleteBook(bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["books"]
      });
      toast.success("Book deleted success")
    },
    onError: () => {
      toast.error("Failed to delete book")
    }
  });
};
