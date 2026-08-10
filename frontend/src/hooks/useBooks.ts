import { createBook, getBooks } from "@/features/books/api/books";
import { type Book, type BookResponse } from "@/features/books/types/book.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";


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
}