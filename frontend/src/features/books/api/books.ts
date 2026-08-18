import { api } from "@/services/api";
import type { Book, BookResponse } from "../types/book.types";
import type { BookFormData } from "../types/book.schema";


export const getBooks = async(categoryId?: string): Promise<Book[]> => {
  // Add category filter to the request if a category was selected 
  const params = categoryId ? { category_id: categoryId } : {};
  const { data } = await api.get("/books", { params });

  return Array.isArray(data) ? data : data.books || [];
};

export const createBook = async( data: BookFormData ): Promise<BookResponse> => {
  const formData = new FormData();

  formData.append("title", data.title);
  formData.append("author", data.author);
  if (data.isbn) formData.append("isbn", data.isbn);
  if (data.category_name) formData.append("category", data.category_name);
  if (data.total_copies) formData.append("total_copies", String(data.total_copies));
  if (data.description) formData.append("description", data.description);
  if (data.pages) formData.append("pages", String(data.pages));

  if (data.image instanceof File){
    formData.append("image", data.image);
  }

  const res = await api.post("/books", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data
};

export const updateBook = async(
  bookId: string,
  data: BookFormData
): Promise<BookResponse> => {

  const formData = new FormData();

  if (data.title !== undefined) formData.append("title", data.title);
  if (data.author !== undefined) formData.append("author", data.author);
  if (data.isbn !== undefined) formData.append("isbn", data.isbn ?? "");
  if (data.category_name !== undefined) formData.append("category_name", data.category_name ?? "");
  if (data.total_copies !== undefined) formData.append("total_copies", String(data.total_copies));
  if (data.description !== undefined) formData.append("description", data.description ?? "");
  if (data.pages !== undefined) formData.append("pages", String(data.pages));

  if(data.image instanceof File){
    formData.append("image", data.image);
  }

  const res = await api.put<BookResponse>(`/books/${bookId}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });

  return res.data;
};

export const deleteBook = async(bookId: string): Promise<void> => {
  await api.delete(`/books/${bookId}`);
};