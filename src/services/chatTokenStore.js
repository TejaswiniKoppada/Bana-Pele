// Holds the chat (Rocket.Chat) session in memory + sessionStorage. Kept
// entirely separate from tokenStore.js (the Mentoring session) — chat uses
// its own auth_token/user_id pair, unrelated to the Mentoring x-auth-token.
const STORAGE_KEY = 'elevate.chatSession';

let chatSession = readFromStorage();

function readFromStorage() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeToStorage() {
  if (chatSession) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(chatSession));
  } else {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

export function setChatSession({ authToken, userId }) {
  chatSession = { authToken, userId };
  writeToStorage();
}

export function clearChatSession() {
  chatSession = null;
  writeToStorage();
}

export function getChatAuthToken() {
  return chatSession?.authToken ?? null;
}

export function getChatUserId() {
  return chatSession?.userId ?? null;
}
