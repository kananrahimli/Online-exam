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
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
      set({ user: null, token: null, initialized: true });
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
