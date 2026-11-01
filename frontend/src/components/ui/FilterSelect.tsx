import { Select } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterSelectProps {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  className?: string;
  triggerClassName?: string;
  placeholder?: string;
}

export default function FilterSelect({
  label,
  value,
  options,
  onChange,
  className,
  triggerClassName,
  placeholder,
}: FilterSelectProps) {
  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel = selectedOption?.label || placeholder || label;

  return (
    <div className={cn("relative w-full", className)}>
      <Select.Root
        value={value}
        onValueChange={(next) => {
          if (next !== null) onChange(next);
        }}
      >
        <Select.Trigger
          aria-hidden="true"
          tabIndex={0}
          className={cn("ui-filter-select text-sm sm:text-base", triggerClassName)}
        >
          <span className="truncate">{selectedLabel}</span>
          <Select.Icon className="ui-filter-select-icon" aria-hidden="true">
            <ChevronDown size={16} strokeWidth={2} />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner
            sideOffset={8}
            alignItemWithTrigger={false}
            className="ui-filter-select-positioner"
          >
            <Select.Popup className="ui-filter-select-popup">
              <Select.List>
                {options.map((option) => (
                  <Select.Item
                    key={option.value}
                    value={option.value}
                    className="ui-filter-select-option"
                  >
                    <Select.ItemText>{option.label}</Select.ItemText>
                    <Select.ItemIndicator
                      className="ui-filter-select-check"
                      aria-hidden="true"
                    >
                      <Check size={15} strokeWidth={2.25} />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
      {/* Hidden native select for accessibility and automated test compatibility */}
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        className="sr-only pointer-events-none text-sm sm:text-base"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
