import { createBook, deleteBook, getBookById, getBookReviews, getBookReviewStats, getBooks, submitReview, updateBook } from "@/features/books/api/books";
import { ReviewEntity } from "@/features/books/models/ReviewEntity";
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

export const useGetBookReviews = (bookId?: string) => {
  return useQuery({
    queryKey: ["book-reviews", bookId],
    queryFn: () => getBookReviews(bookId!),
    enabled: !!bookId,
    select: (data) => data.map((reviewData) => new ReviewEntity(reviewData)),
  });
};

export const useSubmitReview = (bookId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {rating: number, comment: string}) =>
      submitReview(bookId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["book-reviews", bookId] });
      queryClient.invalidateQueries({ queryKey: ["book-review-stats", bookId] });
    }
  })

}

export const useGetBookReviewStats = (bookId?: string) => {

  return useQuery({
    queryKey: ["book-review-stats", bookId],
    queryFn: () => getBookReviewStats(bookId!),
    enabled: !!bookId
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
