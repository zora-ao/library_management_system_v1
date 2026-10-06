import { createBook, deleteBook, getBookById, getBookRecommendations, getBookReviews, getBookReviewStats, getBooks, submitReview, updateBook } from "@/features/books/api/books";
import { ReviewEntity } from "@/features/books/models/ReviewEntity";
import type { BookFormData } from "@/features/books/types/book.schema";
import { type Book } from "@/features/books/types/book.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";

interface BookUpdateProps {
  bookId: string;
  data: BookFormData
}; 

export const useGetBookRecommendations = (bookId: string) => {

  return useQuery<Book[]>({
    queryKey: ["related-books", bookId],
    queryFn: () => getBookRecommendations(bookId),
    enabled: !!bookId,
    staleTime: 1000 * 60 * 5
  })
}

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
      queryClient.invalidateQueries({ queryKey: ["book"] });
      queryClient.invalidateQueries({ queryKey: ["books"] });
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
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to add book")
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
      queryClient.invalidateQueries({
        queryKey: ["book"]
      });
      toast.success("Book updated successfully")
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to update book")
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
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to delete book")
    }
  });
};
