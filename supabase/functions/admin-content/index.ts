// Server-side helper for the password-gated admin review page (Section 6).
//
// The architecture doc says the service role is "used by ... the admin
// page" for writes (Section 4). Taken literally that would mean embedding
// the service-role key in browser-shipped code — which would leak full,
// unrestricted database access to anyone who opens dev tools, defeating the
// entire point of RLS. This function is the safe reading of that
// requirement: it holds the service-role key as a Deno secret (never sent to
// the browser) and the admin page calls *this* function instead, using only
// the public anon key to authenticate the call itself. Flagged in the
// implementation summary as the one place a gap in the doc was filled in
// rather than implemented literally.
//
// GET  -> list all pending items (RLS hides these from anon reads, so this
//         has to go through the service role too).
// POST -> { id, action: 'approve' | 'reject', reviewedBy? } -> updates status.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function serviceClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not available to this function.');
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let supabase;
  try {
    supabase = serviceClient();
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('content_items')
      .select('*')
      .eq('status', 'pending')
      .order('fetched_at', { ascending: false });

    if (error) return json({ error: error.message }, 500);
    return json({ items: data ?? [] });
  }

  if (req.method === 'POST') {
    let body;
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Invalid JSON body.' }, 400);
    }

    const { id, action, reviewedBy } = body ?? {};
    if (!id || (action !== 'approve' && action !== 'reject')) {
      return json({ error: "id and a valid action ('approve' | 'reject') are required." }, 400);
    }

    const { data, error } = await supabase
      .from('content_items')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewed_by: reviewedBy || 'admin',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return json({ error: error.message }, 500);
    return json({ item: data });
  }

  return json({ error: 'Method not allowed' }, 405);
});
