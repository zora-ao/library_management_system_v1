import { Button } from "@/components/ui/button";
import { useCategories } from "@/hooks/useCategories";
import { Loader2 } from "lucide-react";

interface CategoryFilterProps {
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
}

const CategoryFilter = ({ selectedCategoryId, onSelectCategory }: CategoryFilterProps) => {
  const { data: categories = [], isLoading } = useCategories();
  

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading categories...
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 py-2">
      <Button
        variant={selectedCategoryId === null ? "default" : "outline"}
        size="sm"
        className="h-7 text-xs rounded-full px-3"
        onClick={() => onSelectCategory(null)}
      >
        All Books
      </Button>

      {categories.map((cat) => (
        <Button
          key={cat.id}
          variant={selectedCategoryId === cat.id ? "default" : "outline"}
          size="sm"
          className="h-7 text-xs rounded-full px-3"
          onClick={() => onSelectCategory(cat.id)}
        >
          {cat.name}
        </Button>
      ))}
    </div>
  )
}

export default CategoryFilter
