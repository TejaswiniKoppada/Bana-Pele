// Search keyword list for the YouTube ingestion job (Section 5). Kept
// separate from index.ts so the list can be tuned without touching the
// fetch/upsert logic itself. Start small; add more once result quality from
// these has been reviewed via the admin page.
export const KEYWORDS: string[] = [
  'Bana Pele',
  'early childhood development South Africa',
  'ECD practitioner training',
  'child care South Africa',
];
