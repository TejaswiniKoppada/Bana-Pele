// Single shared Supabase client for the Community Voices YouTube content
// pipeline. Uses the public anon key only — safe because RLS on
// content_items restricts anon reads to status='approved' rows and allows
// no anon writes at all (see supabase/migrations/0001_content_items.sql).
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/config/env.js';

// createClient() throws synchronously if the URL is empty/malformed, which
// would crash the whole app at import time before VITE_SUPABASE_URL has been
// set. Fall back to a syntactically-valid placeholder so the app still
// loads; any real query against it will just fail at request time with a
// normal, catchable network error (handled by useRecommendedContent's error
// state) until the real project URL is configured.
export const supabase = createClient(SUPABASE_URL || 'https://placeholder.supabase.co', SUPABASE_ANON_KEY || 'placeholder-anon-key');
