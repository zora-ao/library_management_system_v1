import { api } from "@/services/api";
import type { Category, CategoryFormData } from "../types/category.types";

export const getCategories = async(): Promise<Category[]> => {
  const { data } = await api.get("/categories");
  return Array.isArray(data) ? data : data.categories || [];
}

export const createCategory = async(data: CategoryFormData): Promise<Category> => {
  const { data: res } = await api.post("/categories", data);
  return res.category || res;
};

export const updateCategory = async(id: string, data: CategoryFormData): Promise<Category> => {
  const { data: res } = await api.put(`/categories/${id}`, data);
  return res.category || res;
}

export const deleteCategory = async(id: string) => {
  await api.delete(`/categories/${id}`);
}