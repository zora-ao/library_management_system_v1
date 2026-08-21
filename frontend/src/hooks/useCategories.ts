import { createCategory, deleteCategory, getCategories, updateCategory } from "@/features/books/api/categories";
import type { Category, CategoryFormData } from "@/features/books/types/category.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

    onError: () => {
      toast.error("Failed to add category");
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

    onError: () => {
      toast.error("Failed to update category");
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

    onError: () => {
      toast.error("Failed to delete category");
    }
  })

}

