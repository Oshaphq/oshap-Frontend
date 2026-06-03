interface Category {
  name: string;
  image?: string;
}

interface CategoryTabsProps {
  categories: Category[];
  activeCategory: string;
  onSelect: (category: string) => void;
}

export default function CategoryTabs({
  categories,
  activeCategory,
  onSelect,
}: CategoryTabsProps) {
  return (
    <nav
      aria-label="Menu categories"
      className="flex justify-start py-md gap-s overflow-x-auto [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
    >
      {categories.map((cat) => {
        const active = cat.name === activeCategory;
        return (
          <button
            key={cat.name}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(cat.name)}
            className={`shrink-0 py-s px-md rounded-4xl transition-colors text-label-l4-medium ${
              active
                ? "bg-primary text-on-primary"
                : "bg-surface-container-high text-on-surface-variant border border-outline-variant/30 hover:bg-surface-container-highest"
            }`}
          >
            {cat.name}
          </button>
        );
      })}
    </nav>
  );
}
