import { createCategory, deleteCategory, getCategories, updateCategory } from "@/features/books/api/categories";
import type { CategoryFormData } from "@/features/books/types/category.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";


export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });
}

export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CategoryFormData) => 
      createCategory(data),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['categories']
      });
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
      queryClient.invalidateQueries({
        queryKey: ['categories']
      });
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
      queryClient.invalidateQueries({
        queryKey: ['categories']
      });
      toast.success("Category deleted successfully");
    },

    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to delete category");
    }
  })

}

