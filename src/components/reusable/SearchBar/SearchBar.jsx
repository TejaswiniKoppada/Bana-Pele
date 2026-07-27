import { SearchIcon, MicIcon, FilterIcon } from "@/assets/icons";
import "./SearchBar.css";

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search",
  onFilterClick,
}) {
  return (
    <div className="search-bar">
      <div className="search-bar__field">
        <SearchIcon className="search-bar__icon" />
        <input
          className="search-bar__input"
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
        />
        <MicIcon className="search-bar__icon" />
      </div>
      {onFilterClick && (
        <button
          className="search-bar__filter-btn"
          onClick={onFilterClick}
          aria-label="Filters"
        >
          <FilterIcon />
        </button>
      )}
    </div>
  );
}
