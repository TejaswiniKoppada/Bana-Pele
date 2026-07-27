import { API_BASE_URL, ORG_ID, TIMEZONE } from '@/config/env.js';
import { getAccessToken, getOrgId } from '@/storage/tokenStorage.js';
import { ApiError } from './apiError.js';

/**
 * Thin wrapper around fetch for the Elevate Mentoring API. Unwraps the
 * `{ responseCode, message, result }` envelope every endpoint returns and
 * throws ApiError (surfacing `message`, per the integration guide's documented
 * error shape) on failure.
 *
 * Pass `auth: false` for calls that must go out unauthenticated (login).
 *
 * Some endpoints (e.g. connections/initiate on a duplicate request) reply
 * with `responseCode: "OK"` — not a thrown error — but an empty `result` and
 * an informational `message` explaining why nothing changed. Pass
 * `returnFull: true` to get `{ message, result }` instead of the unwrapped
 * `result`, for callers that need that message. Left false by default so
 * every existing caller's return shape is unaffected.
 */
export async function apiRequest(path, { method = 'GET', body, auth = true, returnFull = false } = {}) {
  const headers = { 'content-type': 'application/json' };

  if (auth) {
    const token = getAccessToken();
    if (!token) {
      throw new ApiError('Not authenticated — no active Elevate session.', { statusCode: 401 });
    }
    headers['x-auth-token'] = token;
    headers['org-id'] = getOrgId() || ORG_ID;
    headers['timezone'] = TIMEZONE;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => null);
  const failed = !response.ok || (data?.responseCode && data.responseCode !== 'OK');

  if (failed) {
    throw new ApiError(data?.message || `Request failed (${response.status})`, {
      statusCode: response.status,
      responseCode: data?.responseCode,
    });
  }

  if (returnFull) {
    return { message: data?.message, result: data?.result ?? data };
  }
  return data?.result ?? data;
}
