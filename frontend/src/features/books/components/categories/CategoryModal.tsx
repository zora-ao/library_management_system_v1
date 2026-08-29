import { useCategories, useCreateCategory, useDeleteCategory, useUpdateCategory } from "@/hooks/useCategories";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { type CategoryFormData, categorySchema, type Category } from "../../types/category.types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";



interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CategoryModal = ({ isOpen, onClose }: CategoryModalProps) => {
  const { data: categories, isLoading } = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema)
  });

  const onSubmit = (data: CategoryFormData) => {
    if (editingCategory) {
      updateMutation.mutate(
        { id: editingCategory.id, data },
        { onSuccess: () => {
          setEditingCategory(null);
          reset();
        }}
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => reset()
      });
    }
  };

  const handleStartEdit = (cat: Category) => {
    setEditingCategory(cat);
    setValue("name", cat.name);
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    reset();
  };


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
          <DialogDescription className="text-xs">
            Add, update, or remove book categories.
          </DialogDescription>
        </DialogHeader>

      {/* for add and edit form */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex items-start gap-2 pt-2">
        <div className="flex-1 space-y-1">
          <Input
            placeholder={editingCategory ? "Edit category name" : "New category name..."}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-[10px] text-destructive">{errors.name.message}</p>
          )}
        </div>
        <Button type="submit" size="sm" disabled={createMutation.isPending || updateMutation.isPending}>
          {editingCategory ? (
            <Check className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4 mr-1" />
          )}
          {editingCategory ? "Save" : "Add"}
        </Button>
        {editingCategory && (
          <Button type="button" variant="ghost" size="sm" onClick={handleCancelEdit}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </form>

      {/* List of the categories */}
      <div className="border rounded-md divide-y max-h-[250px] overflow-y-auto mt-2">
        {isLoading ? (
          <div className="p-4 flex justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : categories?.length === 0 ? (
          <p className="p-4 text-xs text-center text-muted-foreground">No categories found.</p>
        ) : (
          categories?.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/30 transition-colors"
            >
              <span className="font-medium">{cat.name}</span>
              <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => handleStartEdit(cat)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteMutation.mutate(cat.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
      </DialogContent>
    </Dialog>
  )
}

export default CategoryModal
