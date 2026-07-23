import { useState } from 'react';
import { FilterIcon } from '../../assets/icons';
import '../../styles/components/filter-bar.css';

const DISTANCE_OPTIONS = ['5 km radius', '10 km radius', '25 km radius', '50 km radius'];
const TYPE_OPTIONS = ['All', 'Gold Tier', 'Silver Tier', 'Bronze Tier'];

export default function FilterBar({ filters, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const appliedCount = [filters.distance, filters.type].filter(Boolean).length;

  return (
    <div className="filter-bar">
      <button
        type="button"
        className="filter-bar__summary"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        <FilterIcon />
        <span>
          Filters: <strong>{appliedCount} applied</strong>
        </span>
      </button>
      {expanded && (
        <div className="filter-bar__row">
          <label className="filter-bar__field">
            <span>Distance</span>
            <select
              value={filters.distance}
              onChange={(e) => onChange({ ...filters, distance: e.target.value })}
            >
              {DISTANCE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-bar__field">
            <span>Type</span>
            <select value={filters.type} onChange={(e) => onChange({ ...filters, type: e.target.value })}>
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
