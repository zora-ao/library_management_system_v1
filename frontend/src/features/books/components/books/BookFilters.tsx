import { SlidersHorizontal } from "lucide-react";

interface BookFiltersProps {
  selectedSort: string;
  onSortChange: (value: string) => void;
  availability: string;
  onAvailabilityChange: (value: string) => void;
  selectedGenre: string;
  onGenreChange: (genre: string) => void;
  onClearFilters: () => void;
  genres: string[];
}

const BookFilters = ({
  selectedSort,
  onSortChange,
  availability,
  onAvailabilityChange,
  selectedGenre,
  onGenreChange,
  onClearFilters,
  genres,
}: BookFiltersProps) => {
  return (
    <aside className="space-y-6 bg-slate-50/50 p-5 rounded-2xl border border-slate-100 h-fit">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
          <SlidersHorizontal className="w-4 h-4 text-purple-600" />
          Filters & Sort
        </div>
        <button
          onClick={onClearFilters}
          className="text-[11px] font-medium text-purple-600 hover:underline cursor-pointer"
        >
          Clear All
        </button>
      </div>

      {/* Sort By Section */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
          SORT BY
        </label>
        <select
          value={selectedSort}
          onChange={(e) => onSortChange(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-2xs"
        >
          <option value="A-Z">Alphabetical (A-Z)</option>
          <option value="Z-A">Alphabetical (Z-A)</option>
        </select>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => onSortChange("A-Z")}
            className={`py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              selectedSort === "A-Z"
                ? "bg-purple-50 border-purple-200 text-purple-700"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            A – Z
          </button>
          <button
            type="button"
            onClick={() => onSortChange("Z-A")}
            className={`py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              selectedSort === "Z-A"
                ? "bg-purple-50 border-purple-200 text-purple-700"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Z – A
          </button>
        </div>
      </div>

      {/* Availability Section */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
          AVAILABILITY
        </label>
        <div className="space-y-2 text-xs font-medium text-slate-600 pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="availability"
              checked={availability === "all"}
              onChange={() => onAvailabilityChange("all")}
              className="accent-purple-600"
            />
            All
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="flex items-center gap-2">
              <input
                type="radio"
                name="availability"
                checked={availability === "available"}
                onChange={() => onAvailabilityChange("available")}
                className="accent-purple-600"
              />
              Available Now
            </span>
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              In Stock
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="availability"
              checked={availability === "reserved"}
              onChange={() => onAvailabilityChange("reserved")}
              className="accent-purple-600"
            />
            Reserved / Loaned
          </label>
        </div>
      </div>

      {/* Genres Section */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
          GENRES
        </label>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {genres.map((genre) => (
            <button
              key={genre}
              onClick={() => onGenreChange(genre)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                selectedGenre === genre
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default BookFilters;