import { Chip } from "@oshap/shared/ui";

interface Category {
  name: string;
  image?: string;
}

interface CategoryTabsProps {
  categories: Category[];
  activeCategory: string;
  onSelect: (category: string) => void;
}

/**
 * The menu's category row.
 *
 * Named "tabs", built from chips, and correctly so: these are toggles in a
 * scrolling row, not a tablist. `Chip` sets `aria-pressed`; a real tab would
 * need `aria-selected` and roving focus, which this has never had.
 */
export default function CategoryTabs({
  categories,
  activeCategory,
  onSelect,
}: CategoryTabsProps) {
  return (
    <nav
      aria-label="Menu categories"
      className="flex justify-between py-md gap-s overflow-x-auto [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
    >
      {categories.map((cat) => (
        <Chip
          key={cat.name}
          selected={cat.name === activeCategory}
          onClick={() => onSelect(cat.name)}
        >
          {cat.name}
        </Chip>
      ))}
    </nav>
  );
}
