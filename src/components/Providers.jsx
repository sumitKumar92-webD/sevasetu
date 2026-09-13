"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import i18n from "@/i18n/config";
import { get, post } from "@/lib/api";

const AuthContext = createContext({ user: null, worker: null, loading: true });

export function useAuth() {
  return useContext(AuthContext);
}

export default function Providers({ children }) {
  const [state, setState] = useState({ user: null, worker: null, loading: true });

  const refresh = useCallback(async () => {
    try {
      const data = await get("/api/auth/me");
      setState({ user: data.user || null, worker: data.worker || null, loading: false });
    } catch {
      setState({ user: null, worker: null, loading: false });
    }
  }, []);

  useEffect(() => {
    // Deferred so we never call setState synchronously inside the effect body.
    const timer = setTimeout(() => {
      refresh();
      const saved = localStorage.getItem("seva_lang");
      if (saved && saved !== i18n.language) i18n.changeLanguage(saved);
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  const logout = useCallback(async () => {
    await post("/api/auth/logout");
    setState({ user: null, worker: null, loading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, refresh, logout }}>
      {children}
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
    </AuthContext.Provider>
  );
}
