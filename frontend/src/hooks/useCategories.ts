import { createCategory, deleteCategory, getCategories, updateCategory } from "@/features/books/api/categories";
import type { CategoryFormData } from "@/features/books/types/category.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";

const CATEGORY_STALE_TIME_MS = 5 * 60 * 1000;

export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    staleTime: CATEGORY_STALE_TIME_MS,
    refetchOnWindowFocus: true,
  });
}

const invalidateCategoryWorkspace = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ["categories"] });
  queryClient.invalidateQueries({ queryKey: ["books"] });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CategoryFormData) => 
      createCategory(data),

    onSuccess: () => {
      invalidateCategoryWorkspace(queryClient);
      toast.success("Category created successfully");
    },

    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to add category");
    }
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({id, data}: {id: string, data: CategoryFormData}) => 
      updateCategory(id, data),

    onSuccess: () => {
      invalidateCategoryWorkspace(queryClient);
      toast.success("Category updated successfully");
    },

    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to update category");
    }
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      invalidateCategoryWorkspace(queryClient);
      toast.success("Category deleted successfully");
    },

    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to delete category");
    }
  })

}

