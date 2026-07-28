import { createContext, useCallback, useContext, useReducer } from "react";
import * as authApi from "@/features/auth/api/auth.api";

const AppStateContext = createContext(null);

// authApi.isAuthenticated() was already read from the persisted session
// on boot, but currentUser's real id/name/email were not — a hard reload
// (not just a fresh login) silently fell back to the mock object below with
// no id at all, which is what current-user-keyed features (bookmarks, My
// Stories) need. Seed from the persisted session's user if one exists.
const persistedUser = authApi.getCurrentUser();

const initialState = {
  currentUser: {
    name: "Thandi",
    joinedOn: "2026-07-01",
    ...persistedUser,
  },
  isAuthenticated: authApi.isAuthenticated(),
  notificationCount: 4,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_AUTH_USER":
      return {
        ...state,
        currentUser: { ...state.currentUser, ...action.payload },
        isAuthenticated: true,
      };
    case "CLEAR_AUTH":
      return { ...state, isAuthenticated: false };
    default:
      return state;
  }
}

export function AppStateProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const login = useCallback(async (identifier, password) => {
    const user = await authApi.login(identifier, password);
    dispatch({ type: "SET_AUTH_USER", payload: user });
    return user;
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    dispatch({ type: "CLEAR_AUTH" });
  }, []);

  return (
    <AppStateContext.Provider value={{ state, login, logout }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context)
    throw new Error("useAppState must be used within AppStateProvider");
  return context;
}
