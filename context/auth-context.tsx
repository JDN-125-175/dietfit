import React, { createContext, useContext, useState, useEffect } from "react";
import { Platform } from "react-native";

type User = { id: number; username: string };

type AuthState = {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState>({
  token: null,
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

const STORAGE_KEY = "dietfit_auth";

// Simple cross-platform storage (localStorage on web, in-memory fallback on native)
const storage = {
  async get(): Promise<{ token: string; user: User } | null> {
    try {
      if (Platform.OS === "web" && typeof localStorage !== "undefined") {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      }
    } catch {}
    return null;
  },
  async set(token: string, user: User) {
    try {
      if (Platform.OS === "web" && typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
      }
    } catch {}
  },
  async clear() {
    try {
      if (Platform.OS === "web" && typeof localStorage !== "undefined") {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storage.get().then((saved) => {
      if (saved) {
        setToken(saved.token);
        setUser(saved.user);
      }
      setLoading(false);
    });
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    storage.set(newToken, newUser);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    storage.clear();
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
