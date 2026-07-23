import { apiRequest } from './apiClient.js';
import { clearSession, getCurrentSessionUser, isAuthenticated, setSession } from './tokenStore.js';
import { clearChatSession } from './chatTokenStore.js';

/**
 * Real Elevate login (Section 5 of PEER_CONNECT_FULL_INTEGRATION_GUIDE.md).
 * Not wired to any screen yet — no login UI exists in this app. Ready to be
 * called once one is added; every other service call depends on the session
 * this establishes.
 */
export async function login(identifier, password) {
  const result = await apiRequest('/user/v1/account/login', {
    method: 'POST',
    auth: false,
    body: { identifier, password },
  });

  const orgId = String(result.user?.organizations?.[0]?.id ?? '');
  const user = {
    id: result.user?.id,
    name: result.user?.name,
    email: result.user?.identifier,
  };

  setSession({ accessToken: result.access_token, refreshToken: result.refresh_token, orgId, user });
  return user;
}

export function logout() {
  clearSession();
  // Chat uses its own token (see chatService.js) — clear it too so it can't
  // be reused under a different login in the same browser tab.
  clearChatSession();
}

export { isAuthenticated, getCurrentSessionUser as getCurrentUser };
