import {
  addFavoriteBook,
  createBook,
  deleteBook,
  getBookById,
  getBookRecommendations,
  getBookReviews,
  getBookReviewStats,
  getBooks,
  getFavoriteBooks,
  getStaffBooks,
  removeFavoriteBook,
  restoreBook,
  submitReview,
  updateBook,
} from "@/features/books/api/books";
import { ReviewEntity } from "@/features/books/models/ReviewEntity";
import type { BookFormData } from "@/features/books/types/book.schema";
import { type Book, type StaffBookState } from "@/features/books/types/book.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";

interface BookUpdateProps {
  bookId: string;
  data: BookFormData;
}

const BOOK_AVAILABILITY_STALE_TIME_MS = 30 * 1000;

export const useFavoriteBooks = () => {
  return useQuery<Book[]>({
    queryKey: ["favorite-books"],
    queryFn: getFavoriteBooks,
    staleTime: 1000 * 60 * 5,
  });
};

export const useToggleFavoriteBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookId, isFavorite }: { bookId: string; isFavorite: boolean }) => {
      if (isFavorite) {
        return removeFavoriteBook(bookId);
      }
      return addFavoriteBook(bookId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["favorite-books"] });
      toast.success(
        variables.isFavorite ? "Removed from favorites" : "Added to favorites"
      );
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to update favorites");
    },
  });
};

export const useGetBookRecommendations = (bookId: string) => {
  return useQuery<Book[]>({
    queryKey: ["related-books", bookId],
    queryFn: () => getBookRecommendations(bookId),
    enabled: !!bookId,
    staleTime: 1000 * 60 * 5,
  });
};

export const useBooks = (categoryId?: string) => {
  return useQuery<Book[]>({
    queryKey: ["books", categoryId],
    queryFn: () => getBooks(categoryId),
    staleTime: BOOK_AVAILABILITY_STALE_TIME_MS,
    refetchOnWindowFocus: true,
  });
};

export const useGetBookReviews = (bookId?: string) => {
  return useQuery({
    queryKey: ["book-reviews", bookId],
    queryFn: () => getBookReviews(bookId!),
    enabled: !!bookId,
    select: (data) => data.map((reviewData) => new ReviewEntity(reviewData)),
  });
};

export const useStaffBooks = (state: StaffBookState) => {
  return useQuery<Book[]>({
    queryKey: ["books", "staff", state],
    queryFn: () => getStaffBooks(state),
    staleTime: 1000 * 60,
  });
};

const invalidateBookCatalogs = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ["books"] });
  queryClient.invalidateQueries({ queryKey: ["book"] });
  queryClient.invalidateQueries({ queryKey: ["categories"] });
  queryClient.invalidateQueries({ queryKey: ["favorite-books"] });
};

export const useSubmitReview = (bookId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { rating: number; comment: string }) =>
      submitReview(bookId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["book-reviews", bookId] });
      queryClient.invalidateQueries({ queryKey: ["book-review-stats", bookId] });
      queryClient.invalidateQueries({ queryKey: ["book"] });
      queryClient.invalidateQueries({ queryKey: ["books"] });
    },
  });
};

export const useGetBookReviewStats = (bookId?: string) => {
  return useQuery({
    queryKey: ["book-review-stats", bookId],
    queryFn: () => getBookReviewStats(bookId!),
    enabled: !!bookId,
  });
};

export const useGetBookById = (bookId: string | undefined) => {
  return useQuery<Book>({
    queryKey: ["book", bookId],
    queryFn: () => getBookById(bookId!),
    enabled: !!bookId,
  });
};

export const useCreateBooks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBook,
    onSuccess: () => {
      invalidateBookCatalogs(queryClient);
      toast.success("Book added successfully");
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to add book");
    },
  });
};

export const useUpdateBooks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookId, data }: BookUpdateProps) => updateBook(bookId, data),
    onSuccess: () => {
      invalidateBookCatalogs(queryClient);
      toast.success("Book updated successfully");
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to update book");
    },
  });
};

export const useDeleteBooks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookId: string) => deleteBook(bookId),
    onSuccess: () => {
      invalidateBookCatalogs(queryClient);
      toast.success("Book deleted successfully");
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to delete book");
    },
  });
};

export const useArchiveBook = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteBook,
    onSuccess: () => {
      invalidateBookCatalogs(queryClient);
      toast.success("Book archived successfully");
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to archive book");
    },
  });
};

export const useRestoreBook = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: restoreBook,
    onSuccess: () => {
      invalidateBookCatalogs(queryClient);
      toast.success("Book restored successfully");
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to restore book");
    },
  });
};
