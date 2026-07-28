// Approximate category mapping from real designation data — not a native
// Elevate field. Elevate has no category concept at all; this buckets each
// person's primary designation (the same one already shown as their "tier"
// on the card, i.e. designation[0].label) into a group for the Search map
// summary.
//
// NOTE: no real designation reasonably maps to "Churches" (a category shown
// in the Figma reference) — it is intentionally excluded here rather than
// faked. Flagged back to the requester; see summary.
const CATEGORY_BY_LABEL = {
  "Head master": "practitioners",
  Teacher: "practitioners",
  "District education officer": "local-councils",
  "Block education officer": "local-councils",
  "Cluster officials": "communities-hubs",
};

export const CATEGORY_LABELS = {
  practitioners: "Practitioners",
  experts: "Experts",
  "communities-hubs": "Communities/Hubs",
  "local-councils": "Local Councils",
};

function categoryForTier(tierLabel) {
  return CATEGORY_BY_LABEL[tierLabel] || "communities-hubs";
}

// ============================================================================
// DEMO SCOPING (TEMPORARY) — NOT a permanent architectural decision. See
// connectionsService.js's DEMO_VISIBLE_USER_IDS.
// "Practitioner" vs "Expert" here reflects each of these 5 curated accounts'
// real-world professional framing (per their About text), not their Elevate
// designation code — Elevate's fixed designation enum can't represent it:
// Maria and Lindiwe are both coded "Head master", for instance, yet only
// Maria is a practicing ELP registrant while Lindiwe is a child health &
// safety specialist supporting other practitioners. Falls through to the
// designation-based categoryForTier above for anyone not listed here (any
// non-demo account). Delete DEMO_CATEGORY_BY_ID once demo scoping as a whole
// is retired, same as the allowlist it complements.
// ============================================================================
const DEMO_CATEGORY_BY_ID = {
  1509: "practitioners", // Maria — ELP practitioner (Gold)
  1689: "practitioners", // Jo — ELP practitioner (Silver)
  1690: "practitioners", // Marizanne (formerly "Nomsa") — ELP practitioner (Gold)
  1691: "experts", // Lindiwe — child health & safety specialist
  1692: "experts", // Karabo — paediatrician
};

/** `person` needs at least `{ id, tier }`. */
export function categoryForPerson(person) {
  return DEMO_CATEGORY_BY_ID[String(person.id)] || categoryForTier(person.tier);
}
