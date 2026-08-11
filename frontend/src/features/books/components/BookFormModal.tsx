import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useCreateBooks, useUpdateBooks } from "@/hooks/useBooks";
import { type BookFormData, bookSchema } from "../types/book.schema";
import { Loader2, Upload, X } from "lucide-react";
import type { Book } from "../types/book.types";

interface BookFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  book?: Book | null;
}

const BookFormModal = ({ isOpen, onClose, book }: BookFormModalProps) => {
  const createBookMutation = useCreateBooks();
  const updateBookMutation = useUpdateBooks();
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const isEditing = !!book;
  const isPending = createBookMutation.isPending || updateBookMutation.isPending;

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      title: "",
      author: "",
      isbn: "",
      category: "",
      description: "",
      total_copies: 1,
      pages: "",
      image: undefined,
    },
  });

  useEffect(() => {
    if (book) {
      reset({
        title: book.title || "",
        author: book.author || "",
        isbn: book.isbn || "",
        category: book.category || "",
        description: book.description || "",
        total_copies: book.total_copies ?? 1,
        pages: book.pages ? String(book.pages) : "",
      });
      setImagePreview(book.image_url || null);
    } else {
      reset({
        title: "",
        author: "",
        isbn: "",
        category: "",
        description: "",
        total_copies: 1,
        pages: "",
        image: undefined,
      });
      setImagePreview(null);
    }
  }, [book, reset, isOpen])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setValue("image", file, { shouldValidate: true });
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setValue("image", undefined, { shouldValidate: true });
    setImagePreview(null);
  };

  const handleClose = () => {
    reset();
    setImagePreview(null);
    onClose();
  };

  const onSubmit = (data: BookFormData) => {
    if (isEditing && book){
      const bookId = parseInt(book.book_id);
      updateBookMutation.mutate(
        { bookId, data },
        { onSuccess: handleClose }
      );
    } else {
      createBookMutation.mutate(data, { onSuccess: handleClose });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-muted/40 px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl font-bold tracking-tight">Add New Book</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Fill in the details below to add a new title to the library catalog.
          </DialogDescription>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column: Image Upload Area */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                Book Cover
              </Label>

              <div className="relative group border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-2 text-center transition-colors h-[210px] flex flex-col items-center justify-center bg-muted/20">
                {imagePreview ? (
                  <div className="relative w-full h-full rounded overflow-hidden">
                    <img
                      src={imagePreview}
                      alt="Cover Preview"
                      className="w-full h-full object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-1 right-1 bg-background/80 hover:bg-background text-foreground rounded-full p-1 shadow-sm transition-transform active:scale-95"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="cover-upload"
                    className="cursor-pointer flex flex-col items-center justify-center w-full h-full space-y-2 p-4"
                  >
                    <div className="p-3 bg-background border rounded-full shadow-sm">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium">Upload cover</p>
                      <p className="text-[10px] text-muted-foreground">PNG, JPG up to 5MB</p>
                    </div>
                    <input
                      id="cover-upload"
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleImageChange}
                    />
                  </label>
                )}
              </div>
              {errors.image && (
                <p className="text-xs text-destructive">{errors.image.message as string}</p>
              )}
            </div>

            {/* Right Column: Key Details */}
            <div className="md:col-span-2 space-y-4">
              {/* Title */}
              <div className="space-y-1">
                <Label htmlFor="title" className="text-xs font-medium">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input id="title" placeholder="e.g. To Kill a Mockingbird" {...register("title")} />
                {errors.title && (
                  <p className="text-xs text-destructive">{errors.title.message}</p>
                )}
              </div>

              {/* Author & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="author" className="text-xs font-medium">
                    Author <span className="text-destructive">*</span>
                  </Label>
                  <Input id="author" placeholder="Harper Lee" {...register("author")} />
                  {errors.author && (
                    <p className="text-xs text-destructive">{errors.author.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="category" className="text-xs font-medium">
                    Category
                  </Label>
                  <Input id="category" placeholder="Fiction, Science" {...register("category")} />
                  {errors.category && (
                    <p className="text-xs text-destructive">{errors.category.message}</p>
                  )}
                </div>
              </div>

              {/* ISBN, Copies, Pages */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="isbn" className="text-xs font-medium">
                    ISBN
                  </Label>
                  <Input id="isbn" placeholder="978-3-16..." {...register("isbn")} />
                  {errors.isbn && (
                    <p className="text-xs text-destructive">{errors.isbn.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="total_copies" className="text-xs font-medium">
                    Copies <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="total_copies"
                    type="number"
                    min={1}
                    {...register("total_copies")}
                  />
                  {errors.total_copies && (
                    <p className="text-xs text-destructive">{errors.total_copies.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="pages" className="text-xs font-medium">
                    Pages
                  </Label>
                  <Input id="pages" type="number" min={1} placeholder="324" {...register("pages")} />
                  {errors.pages && (
                    <p className="text-xs text-destructive">{errors.pages.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Full Width Row: Description */}
          <div className="space-y-1 border-t pt-4">
            <Label htmlFor="description" className="text-xs font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="Brief summary or synopsis of the book..."
              className="resize-none text-xs"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createBookMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createBookMutation.isPending}>
              {createBookMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {createBookMutation.isPending ? "Adding..." : "Add Book"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BookFormModal;