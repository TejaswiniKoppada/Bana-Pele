# Community Voices — YouTube Content Library
### Architecture & Implementation Guide (Bana Pele PoC)

**Scope:** automated, keyword-based YouTube video discovery for the Community Voices "Recommended" tab, with admin approval before anything goes live. Instagram/TikTok are explicitly out of scope (see prior discussion — no viable discovery API for either without scraping, which carries real ToS/legal risk for an NGO-affiliated product).

This is entirely separate infrastructure from Elevate — Elevate has no Community Voices backend and its own "forms" mechanism for this kind of content is static/hardcoded, which is exactly what we're avoiding here.

---

## 1. Why this needs its own small backend

The frontend cannot safely call the YouTube API directly:
- It would require embedding the YouTube API key in client-side code, visible to anyone
- There's nowhere for the frontend to persist "which videos have already been reviewed" — every page load would need a fresh search, burning quota fast
- There's no way to gate content behind admin approval from the client alone

So this needs: a place to run the search job, a place to store results + their approval status, and a way for the frontend to read only approved items.

---

## 2. Recommended Stack

**Supabase** (Postgres + Edge Functions) — recommended for this PoC because:
- Postgres gives a real relational table for content + status, with an auto-generated REST API (PostgREST) the frontend can query directly
- Row Level Security (RLS) can enforce "only approved rows are publicly readable" without writing a custom read endpoint
- Edge Functions (Deno-based serverless) can run the YouTube fetch job
- Free tier is sufficient for PoC scale

*(Firebase — Cloud Functions + Firestore + Cloud Scheduler — is a valid alternative if the team is more familiar with it; the architecture below maps directly, just swap Postgres tables for Firestore collections and PostgREST for a small read function.)*

---

## 3. Architecture

```
┌──────────────────────────────────────────────────────────┐
│  GitHub Actions (scheduled workflow, e.g. daily at 6am)   │
└────────────────────────┬───────────────────────────────────┘
                          │ HTTP trigger
                          ▼
┌──────────────────────────────────────────────────────────┐
│  Supabase Edge Function: fetch-youtube-content             │
│  - Loops over a configured keyword list                    │
│  - Calls YouTube Data API v3 search.list per keyword        │
│  - Upserts results into content_items (status: pending)    │
│  - YOUTUBE_API_KEY stored as a Supabase secret, never       │
│    exposed to the frontend                                 │
└────────────────────────┬───────────────────────────────────┘
                          │ writes
                          ▼
┌──────────────────────────────────────────────────────────┐
│  Postgres: content_items table                             │
└──────┬─────────────────────────────────────┬───────────────┘
       │ read (pending items)                 │ read (approved only, via RLS)
       ▼                                       ▼
┌───────────────────┐                 ┌──────────────────────┐
│  Admin Review Page  │                 │  Community Voices      │
│  (approve/reject)   │                 │  "Recommended" tab      │
│  writes status back │                 │  (frontend, read-only)  │
└───────────────────┘                 └──────────────────────┘
```

---

## 4. Data Model

Table: `content_items`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, pk | default `gen_random_uuid()` |
| `platform` | text | `'youtube'` (kept for future extensibility, even though scoped to YouTube only now) |
| `video_id` | text | YouTube video ID |
| `title` | text | |
| `description` | text | |
| `thumbnail_url` | text | |
| `channel_title` | text | |
| `published_at` | timestamptz | from YouTube |
| `fetched_at` | timestamptz | default `now()` |
| `search_keyword` | text | which keyword surfaced this result — useful for tuning the keyword list later |
| `status` | text | `'pending'` \| `'approved'` \| `'rejected'`, default `'pending'` |
| `reviewed_by` | text | nullable |
| `reviewed_at` | timestamptz | nullable |

**Unique constraint:** `(platform, video_id)` — prevents the same video being re-inserted (and re-appearing for review) on every subsequent fetch run.

**RLS policy:** public/anon read access allowed only where `status = 'approved'`. Insert/update restricted to the service role (used by the Edge Function and admin page), never exposed to anonymous frontend requests.

---

## 5. Ingestion Job

- **Keyword list** (start small, tune based on result quality): `"Bana Pele"`, `"early childhood development South Africa"`, `"ECD practitioner training"`, `"child care South Africa"` — configurable, not hardcoded into the function logic itself (store as a small array/config, easy to edit without redeploying core logic).
- **Per keyword call:** `GET https://www.googleapis.com/youtube/v3/search?part=snippet&q=<keyword>&type=video&order=relevance&maxResults=10&key=<YOUTUBE_API_KEY>`
- **Upsert logic:** for each result, insert if `(platform, video_id)` doesn't already exist; skip silently if it does (already reviewed or pending — don't reset its status).
- **Quota management:** each search call costs 100 units against YouTube's 10,000/day free quota. With ~4 keywords run once daily, that's 400 units/day — well within budget, with plenty of headroom if the keyword list grows later.
- **Schedule:** once daily is sufficient for a content feed like this — no need for more frequent runs.

---

## 6. Admin Approval Flow

- A simple internal-only page (e.g. `/admin/content-review`), listing all `status = 'pending'` items: thumbnail, title, channel, keyword that surfaced it.
- **Approve** → `status = 'approved'`, `reviewed_by`, `reviewed_at` set.
- **Reject** → `status = 'rejected'` (kept in the table, not deleted — this is what prevents a rejected video from reappearing on the next fetch run, since the unique constraint will skip it).
- **Access control for PoC:** a simple shared password gate on this one route is sufficient for now — this is an internal tool, not user-facing. Flag clearly that real authentication (tied to an actual admin role) should replace this before any production use.

---

## 7. Frontend Consumption (Community Voices "Recommended" tab)

- Query Supabase directly for `content_items` where `status = 'approved'`, ordered by `published_at desc`, limited to a reasonable page size (e.g. 20).
- Because of the RLS policy in Section 4, this can be a direct read from the frontend using Supabase's public anon key — no custom backend endpoint needed for this part.
- Map each row into the existing Community Voices video card component (title, thumbnail, platform icon, link to the video) — reuse whatever card component already exists for this tab, don't build a new one.

---

## 8. Step-by-Step Implementation Plan

1. **Set up a Supabase project.** Create the `content_items` table and RLS policy from Section 4.
2. **Get a YouTube Data API v3 key** (Google Cloud Console — enable the YouTube Data API v3 for a project, generate an API key, restrict it to that API). Store it as a Supabase Edge Function secret, never in frontend code or committed to the repo.
3. **Build the Edge Function** (`fetch-youtube-content`) implementing the ingestion logic from Section 5. Test it manually (direct invoke) before scheduling it.
4. **Set up the scheduled trigger** — a GitHub Actions workflow (`.yml` with a `schedule: cron` trigger) that calls the Edge Function's URL once daily. Simpler to set up and reason about than Postgres-side cron extensions for a PoC.
5. **Build the admin review page** — simple list UI, approve/reject buttons, password-gated route.
6. **Wire the frontend's Recommended tab** to read approved `content_items` directly from Supabase, replacing whatever static/placeholder content is there now.
7. **Run the ingestion job manually once**, review and approve a few results through the admin page, and confirm they appear correctly in the Recommended tab end-to-end before turning on the schedule.

---

## 9. What This Does Not Cover (explicitly out of scope)

- Instagram and TikTok content — per earlier discussion, no viable discovery API without scraping; recommend manual curation (oEmbed for specific known URLs) or community-submitted content via the existing "My Stories" flow instead, as a separate follow-up decision.
- Bookmarking/My Stories functionality — this document covers Recommended-tab sourcing only.
- Production-grade admin authentication — the password-gate approach here is PoC-appropriate only.
