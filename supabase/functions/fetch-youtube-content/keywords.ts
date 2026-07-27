// Search keyword list for the YouTube ingestion job (Section 5). Kept
// separate from index.ts so the list can be tuned without touching the
// fetch/upsert logic itself. Start small; add more once result quality from
// these has been reviewed via the admin page.
//
// Every search term is scoped to South Africa so YouTube's relevance ranking
// doesn't pull in unrelated international results. Add new topics to
// BASE_KEYWORDS below (without "South Africa" — it's applied automatically);
// don't add it to the topic string yourself or it'll end up duplicated.
const REGION = "South Africa";

const BASE_KEYWORDS: string[] = [
  "Bana Pele",
  "early childhood development",
  "ECD practitioner training",
  "child care",
  "child nutrition",
];

export const KEYWORDS: string[] = BASE_KEYWORDS.map(
  (topic) => `${REGION} ${topic}`,
);
