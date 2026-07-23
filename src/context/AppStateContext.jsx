import { createContext, useCallback, useContext, useReducer } from 'react';
import * as authService from '../services/authService';

const AppStateContext = createContext(null);

// authService.isAuthenticated() was already read from the persisted session
// on boot, but currentUser's real id/name/email were not — a hard reload
// (not just a fresh login) silently fell back to the mock object below with
// no id at all, which is what current-user-keyed features (mock location,
// bookmarks, My Stories) need. Seed from the persisted session's user if one
// exists.
const persistedUser = authService.getCurrentUser();

const initialState = {
  currentUser: {
    name: 'Thandi',
    role: 'Aspiring ELP Practitioner',
    joinedOn: '2026-07-01',
    tier: 'Pre-Bronze',
    location: 'Holly Country, Sasolburg',
    ...persistedUser,
  },
  isAuthenticated: authService.isAuthenticated(),
  notificationCount: 4,
  // 50km default so the MOCK distance data (see utils/mockLocation.js) doesn't
  // accidentally hide every mentor in this tiny demo org before anyone
  // touches the filter — it still genuinely narrows results when changed.
  peerConnectFilters: {
    distance: '50 km radius',
    type: 'All',
  },
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_PEER_CONNECT_FILTERS':
      return { ...state, peerConnectFilters: action.payload };
    case 'SET_AUTH_USER':
      return { ...state, currentUser: { ...state.currentUser, ...action.payload }, isAuthenticated: true };
    case 'CLEAR_AUTH':
      return { ...state, isAuthenticated: false };
    default:
      return state;
  }
}

export function AppStateProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setPeerConnectFilters = useCallback((filters) => {
    dispatch({ type: 'SET_PEER_CONNECT_FILTERS', payload: filters });
  }, []);

  const login = useCallback(async (identifier, password) => {
    const user = await authService.login(identifier, password);
    dispatch({ type: 'SET_AUTH_USER', payload: user });
    return user;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    dispatch({ type: 'CLEAR_AUTH' });
  }, []);

  return (
    <AppStateContext.Provider value={{ state, setPeerConnectFilters, login, logout }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used within AppStateProvider');
  return context;
}
