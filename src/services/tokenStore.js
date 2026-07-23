// Holds the Elevate session in memory + sessionStorage. Kept separate from
// apiClient/authService so neither has to import the other for state access.
const STORAGE_KEY = 'elevate.session';

let session = readFromStorage();

function readFromStorage() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeToStorage() {
  if (session) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

export function setSession({ accessToken, refreshToken, orgId, user }) {
  session = { accessToken, refreshToken, orgId, user };
  writeToStorage();
}

export function clearSession() {
  session = null;
  writeToStorage();
}

export function getAccessToken() {
  return session?.accessToken ?? null;
}

export function getOrgId() {
  return session?.orgId ?? null;
}

export function getCurrentSessionUser() {
  return session?.user ?? null;
}

export function isAuthenticated() {
  return Boolean(session?.accessToken);
}
