import * as z from "zod";

export const bookSchema = z.object({
  isbn: z.string().optional().or(z.literal("")),
  title: z.string().min(1, "Title is required").max(255, "Title must be less than 255 characters"),
  author: z.string().min(1, "Author is required").max(255, "Author name is too long"),
  category: z.string().optional().or(z.literal("")),
  image: z.instanceof(File).optional().or(z.string().optional()),
  total_copies: z.coerce.number().int().min(1, "At least 1 copy required"),
  description: z.string().max(250, "Max 250 characters").optional().or(z.literal("")),
  pages: z.coerce.number().int().positive("Must be positive").optional().or(z.literal("")),
});

export type BookFormData = z.infer<typeof bookSchema>;