// Admin review page's data layer (Section 6). Talks to the admin-content
// Edge Function rather than Supabase directly — that function holds the
// service-role key server-side, since content_items reads/writes for
// pending items are restricted by RLS to the service role, never the anon
// key this frontend otherwise uses (see supabase/functions/admin-content).
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/env.js';

function functionUrl() {
  return `${SUPABASE_URL}/functions/v1/admin-content`;
}

async function callAdminContentFunction(options = {}) {
  const response = await fetch(functionUrl(), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || `Request failed (${response.status})`);
  }
  return data;
}

export async function listPendingContentItems() {
  const data = await callAdminContentFunction({ method: 'GET' });
  return data.items ?? [];
}

export async function approveContentItem(id) {
  const data = await callAdminContentFunction({
    method: 'POST',
    body: JSON.stringify({ id, action: 'approve', reviewedBy: 'admin' }),
  });
  return data.item;
}

export async function rejectContentItem(id) {
  const data = await callAdminContentFunction({
    method: 'POST',
    body: JSON.stringify({ id, action: 'reject', reviewedBy: 'admin' }),
  });
  return data.item;
}
