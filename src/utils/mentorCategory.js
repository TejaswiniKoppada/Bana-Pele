// Approximate category mapping from real designation data — not a native
// Elevate field. Elevate has no category concept at all; this buckets each
// person's primary designation (the same one already shown as their "tier"
// on the card, i.e. designation[0].label) into one of three groups for the
// Search map view.
//
// NOTE: no real designation reasonably maps to "Churches" (a category shown
// in the Figma reference) — it is intentionally excluded here rather than
// faked. Flagged back to the requester; see summary.
const CATEGORY_BY_LABEL = {
  'Head master': 'practitioners',
  Teacher: 'practitioners',
  'District education officer': 'local-councils',
  'Block education officer': 'local-councils',
  'Cluster officials': 'communities-hubs',
};

export const CATEGORY_LABELS = {
  practitioners: 'Practitioners',
  'communities-hubs': 'Communities/Hubs',
  'local-councils': 'Local Councils',
};

/** Falls back to "communities-hubs" for any other/custom designation. */
export function categoryForTier(tierLabel) {
  return CATEGORY_BY_LABEL[tierLabel] || 'communities-hubs';
}
