import { api } from "@/services/api";
import type { Book, BookResponse } from "../types/book.types";
import type { BookFormData } from "../types/book.schema";


export const getBooks = async(): Promise<Book[]> => {
  const res = await api.get<Book[]>("/books");

  return res.data
};

export const createBook = async( data: BookFormData ): Promise<BookResponse> => {
  const formData = new FormData();

  formData.append("title", data.title);
  formData.append("author", data.author);
  if (data.isbn) formData.append("isbn", data.isbn);
  if (data.category) formData.append("category", data.category);
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

} 