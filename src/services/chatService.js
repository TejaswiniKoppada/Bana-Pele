// Elevate chat — a separate Rocket.Chat-based service (elevate-chat.shikshalokam.org),
// entirely distinct from the Mentoring API. Confirmed live against the real
// backend: plain REST, no WebSocket needed.
//
// Auth: getCommunicationToken is a Mentoring endpoint (reuses the existing
// Mentoring x-auth-token via apiRequest), but its response is a *chat*
// auth_token/user_id pair used only for the calls below — never mixed into
// the Mentoring session in tokenStore.js.
import { apiRequest } from './apiClient.js';
import { CHAT_API_BASE_URL } from '../config/env.js';
import { clearChatSession, getChatAuthToken, getChatUserId, setChatSession } from './chatTokenStore.js';

async function fetchAndStoreChatSession() {
  const result = await apiRequest('/mentoring/v1/profile/getCommunicationToken');
  setChatSession({ authToken: result.auth_token, userId: result.user_id });
  return { authToken: result.auth_token, userId: result.user_id };
}

async function ensureChatSession() {
  const authToken = getChatAuthToken();
  const userId = getChatUserId();
  if (authToken && userId) return { authToken, userId };
  return fetchAndStoreChatSession();
}

/** Current user's chat identity (`u._id` to compare against for bubble alignment) — null until a chat screen has fetched it at least once. */
export function getMyChatUserId() {
  return getChatUserId();
}

async function chatFetch(path, body, { isRetry = false } = {}) {
  const { authToken, userId } = await ensureChatSession();

  const response = await fetch(`${CHAT_API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': authToken,
      'X-User-Id': userId,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);
  const isAuthError = response.status === 401 || data?.status === 'error';

  if (isAuthError && !isRetry) {
    // Cached token may have expired — fetch a fresh one and retry exactly
    // once. Avoids refetching the token on every single message.
    clearChatSession();
    return chatFetch(path, body, { isRetry: true });
  }

  if (!response.ok || isAuthError || data?.success === false) {
    throw new Error(data?.error || data?.message || `Chat request failed (${response.status})`);
  }

  return data;
}

function extractTimestamp(ts) {
  if (ts && typeof ts === 'object' && ts.$date != null) return ts.$date;
  if (typeof ts === 'string') return Date.parse(ts);
  return typeof ts === 'number' ? ts : Date.now();
}

function normalizeMessage(raw) {
  return {
    id: raw._id,
    text: raw.msg,
    timestamp: extractTimestamp(raw.ts),
    senderId: raw.u?._id,
    senderName: raw.u?.name,
    roomId: raw.rid,
  };
}

function ddpCallId() {
  return Math.random().toString(36).slice(2);
}

/**
 * loadHistory's response is unusual: the real payload is a JSON string
 * INSIDE the top-level "message" field (mirroring the DDP-over-REST request
 * shape below), not a normal nested object — confirmed live. Must be
 * JSON.parse()'d a second time to reach `.result.messages`.
 */
export async function loadChatHistory(roomId, limit = 50) {
  const data = await chatFetch('/api/v1/method.call/loadHistory', {
    message: JSON.stringify({
      msg: 'method',
      id: ddpCallId(),
      method: 'loadHistory',
      params: [roomId, null, limit, null],
    }),
  });
  const parsed = JSON.parse(data.message);
  const messages = parsed?.result?.messages ?? [];
  return messages.map(normalizeMessage).sort((a, b) => a.timestamp - b.timestamp);
}

/** Sends a message and returns the server-echoed message, normalized the same way loadChatHistory's messages are. */
export async function sendChatMessage(roomId, text) {
  const data = await chatFetch('/api/v1/chat.sendMessage', {
    message: { rid: roomId, msg: text },
  });
  return normalizeMessage(data.message);
}
