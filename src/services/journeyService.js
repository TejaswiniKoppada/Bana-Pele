// Talks to demo-bap-server.js (skillpath-backend) to trigger a real Beckn
// transaction with elevate-bpp -- a separate, new Beckn provider that
// generates a personalized learning journey via Claude. Entirely
// unrelated to the real Elevate Mentoring API used elsewhere in this app
// (see src/api/client.js) -- different infrastructure, different service.
//
// KNOWN LIMITATION (fine for this demo, worth fixing before anything
// real): demo-bap resolves "which learner" server-side via an
// x-learner-token header, which this app never sends -- so every call
// from here currently lands on the same single demo-guest learner
// record on the backend, regardless of who's actually logged into this
// app. Good enough while there's one demo persona (Thandi); would need
// a real per-user token handshake with demo-bap before supporting
// multiple real accounts.

import { DEMO_BAP_BASE_URL, ELEVATE_BPP_BASE_URL } from '@/config/env.js';

export async function triggerJourneyRequest({ goal, timeframe, currentTier, assessment }) {
  const res = await fetch(`${DEMO_BAP_BASE_URL}/api/trigger/journey-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal, timeframe, currentTier, assessment }),
  });
  if (!res.ok) throw new Error(`Failed to start your journey (${res.status})`);
  return res.json();
}

/**
 * Quick sufficiency check on the assessment text before committing to
 * the full journey generation -- catches meaningless input (e.g.
 * "aaaaa") and returns a real follow-up question instead of silently
 * generating something generic. Talks directly to elevate-bpp (not
 * demo-bap) since this is a fast, throwaway check, not a real Beckn
 * transaction step.
 */
export async function validateAssessment({ goal, currentTier, assessment }) {
  const res = await fetch(`${ELEVATE_BPP_BASE_URL}/api/elevate/validate-assessment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal, currentTier, assessment }),
  });
  if (!res.ok) return { sufficient: true, followUp: '' }; // fail open
  return res.json();
}

/**
 * The journey is generated asynchronously (a real Claude call takes a few
 * seconds) -- demo-bap stores the result on the learner record once
 * ready, exposed here via /api/state. Returns null until it's ready.
 */
export async function fetchJourneyStatus() {
  const res = await fetch(`${DEMO_BAP_BASE_URL}/api/state`);
  if (!res.ok) throw new Error(`Failed to check journey status (${res.status})`);
  const data = await res.json();
  return data.journey || null;
}

/** Polls fetchJourneyStatus until a journey appears, or timeoutMs elapses. */
export function pollForJourney({ intervalMs = 3000, timeoutMs = 90000 } = {}) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = async () => {
      try {
        const journey = await fetchJourneyStatus();
        if (journey) {
          resolve(journey);
          return;
        }
      } catch (err) {
        reject(err);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error('Timed out waiting for your journey to be ready.'));
        return;
      }
      setTimeout(tick, intervalMs);
    };
    tick();
  });
}
