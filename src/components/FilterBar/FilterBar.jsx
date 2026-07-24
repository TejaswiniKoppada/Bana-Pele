import { useState } from 'react';
import { FilterIcon } from '../../assets/icons';
import '../../styles/components/filter-bar.css';

// Real values confirmed in ARCHITECTURE_UPDATE_POST_CALL.md (Section 2) —
// Elevate hasn't made these fields/filters live yet, so every field here is
// disabled rather than wired to fabricated filtering logic. Once Elevate
// exposes the underlying data, re-enable the corresponding field and wire
// its onChange back into search.
const NOT_YET_AVAILABLE = 'Not yet available — coming soon';

const DISTANCE_OPTIONS = ['5 km', '10 km', '20 km', '50 km', '100 km'];
const ELP_TYPE_OPTIONS = ['Centre-based', 'Non-Centre-based'];
const ELP_TIER_OPTIONS = ['Pre-Bronze', 'Bronze', 'Silver', 'Gold'];

function DisabledFilterField({ label, placeholder, options }) {
  return (
    <label className="filter-bar__field filter-bar__field--disabled" title={NOT_YET_AVAILABLE}>
      <span>
        {label} <em className="filter-bar__field-note">(coming soon)</em>
      </span>
      <select disabled defaultValue="">
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function FilterBar() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="filter-bar">
      <button
        type="button"
        className="filter-bar__summary"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        <FilterIcon />
        <span>Filters</span>
      </button>
      {expanded && (
        <div className="filter-bar__row">
          <DisabledFilterField label="Distance" placeholder="Select radius" options={DISTANCE_OPTIONS} />
          <DisabledFilterField label="ELP Type" placeholder="Select type" options={ELP_TYPE_OPTIONS} />
          <DisabledFilterField label="ELP Tier" placeholder="Select tier" options={ELP_TIER_OPTIONS} />
        </div>
      )}
    </div>
  );
}
