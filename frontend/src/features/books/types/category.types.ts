import * as z from "zod";

export const categorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters"),
});

export type CategoryFormData = z.infer<typeof categorySchema>;

export interface Category {
  id: string;
  name: string;
  book_count?: number;
}
