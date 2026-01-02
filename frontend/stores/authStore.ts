import { create } from "zustand";
import { User } from "@/lib/types";

interface AuthState {
  user: User | null;
  token: string | null;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  initialize: () => void;
}

const loadFromStorage = () => {
  if (typeof window === "undefined") return { user: null, token: null };

  try {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;
    return { user, token };
  } catch {
    return { user: null, token: null };
  }
};

export const useAuthStore = create<AuthState>((set, get) => {
  // Initial state - only load once when store is created
  const initial =
    typeof window !== "undefined"
      ? loadFromStorage()
      : { user: null, token: null };

  return {
    user: initial.user,
    token: initial.token,
    initialized: typeof window === "undefined" ? true : false,
    setUser: (user) => {
      if (typeof window !== "undefined") {
        if (user) {
          localStorage.setItem("user", JSON.stringify(user));
        } else {
          localStorage.removeItem("user");
        }
      }
      set({ user });
    },
    setToken: (token) => {
      if (typeof window !== "undefined") {
        if (token) {
          localStorage.setItem("token", token);
        } else {
          localStorage.removeItem("token");
        }
      }
      set({ token });
    },
    logout: () => {
      if (typeof window !== "undefined") {
        // Clear localStorage
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        
        // Clear cookies - try different approaches to ensure they're deleted
        const cookieNames = ["token", "user"];
        const expires = "Thu, 01 Jan 1970 00:00:00 UTC";
        
        cookieNames.forEach((name) => {
          // Clear with path=/
          document.cookie = `${name}=; path=/; expires=${expires}; SameSite=Lax;`;
          // Clear with empty path
          document.cookie = `${name}=; path=; expires=${expires}; SameSite=Lax;`;
          // Clear with max-age=0
          document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax;`;
          // Clear without SameSite
          document.cookie = `${name}=; path=/; expires=${expires};`;
        });
        
        // Clear state first
        set({ user: null, token: null, initialized: true });
        
        // Force full page reload to clear server-side cookies and ensure clean state
        window.location.href = "/login";
      } else {
        // Server-side: just clear state
        set({ user: null, token: null, initialized: true });
      }
    },
    initialize: () => {
      const state = get();
      // Only initialize once
      if (state.initialized) return;

      const data = loadFromStorage();
      set({ user: data.user, token: data.token, initialized: true });
    },
  };
});
