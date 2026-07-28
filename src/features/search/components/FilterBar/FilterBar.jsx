import { useState } from "react";
import { FilterIcon } from "@/assets/icons";
import "./FilterBar.css";

// ELP Type/Tier still have no real field/filter from Elevate — stay disabled.
// Distance is now real: see hooks/useGeocoding.js + services/geocodingService.js.
const NOT_YET_AVAILABLE = "Not yet available — coming soon";

const DISTANCE_OPTIONS = [5, 10, 20, 50, 100];
const ELP_TYPE_OPTIONS = ["Centre-based", "Non-Centre-based"];
const ELP_TIER_OPTIONS = ["Pre-Bronze", "Bronze", "Silver", "Gold"];

function DisabledFilterField({ label, placeholder, options, reason }) {
  return (
    <label
      className="filter-bar__field filter-bar__field--disabled"
      title={reason || NOT_YET_AVAILABLE}
    >
      <span>
        {label}{" "}
        <em className="filter-bar__field-note">
          {reason ? "(unavailable)" : "(coming soon)"}
        </em>
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

export default function FilterBar({
  distanceKm,
  onDistanceChange,
  distanceUnavailableReason,
}) {
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
          {distanceUnavailableReason ? (
            <DisabledFilterField
              label="Distance"
              placeholder="Select radius"
              options={DISTANCE_OPTIONS.map((km) => `${km} km`)}
              reason={distanceUnavailableReason}
            />
          ) : (
            <label className="filter-bar__field">
              <span>Distance</span>
              <select
                value={distanceKm ?? ""}
                onChange={(e) =>
                  onDistanceChange(
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              >
                <option value="">Any distance</option>
                {DISTANCE_OPTIONS.map((km) => (
                  <option key={km} value={km}>
                    {km} km
                  </option>
                ))}
              </select>
            </label>
          )}
          <DisabledFilterField
            label="ELP Type"
            placeholder="Select type"
            options={ELP_TYPE_OPTIONS}
          />
          <DisabledFilterField
            label="ELP Tier"
            placeholder="Select tier"
            options={ELP_TIER_OPTIONS}
          />
        </div>
      )}
    </div>
  );
}
