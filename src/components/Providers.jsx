"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { Toaster } from "react-hot-toast";

import i18n from "@/i18n/config";

import {
  isRightToLeft,
} from "@/i18n/languages";

import {
  get,
  post,
} from "@/lib/api";

const AuthContext = createContext({
  user: null,
  worker: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function Providers({
  children,
}) {
  const [state, setState] =
    useState({
      user: null,
      worker: null,
      loading: true,
    });

  const refresh =
    useCallback(async () => {
      try {
        const data =
          await get(
            "/api/auth/me"
          );

        setState({
          user:
            data.user || null,

          worker:
            data.worker || null,

          loading: false,
        });
      } catch {
        setState({
          user: null,
          worker: null,
          loading: false,
        });
      }
    }, []);

  useEffect(() => {
    const timer = setTimeout(
      async () => {
        const savedLanguage =
          localStorage.getItem(
            "seva_lang"
          ) || "en";

        await i18n.changeLanguage(
          savedLanguage
        );

        document.documentElement.lang =
          savedLanguage;

        document.documentElement.dir =
          isRightToLeft(
            savedLanguage
          )
            ? "rtl"
            : "ltr";

        await refresh();
      },
      0
    );

    return () =>
      clearTimeout(timer);
  }, [refresh]);

  const logout =
    useCallback(async () => {
      await post(
        "/api/auth/logout"
      );

      setState({
        user: null,
        worker: null,
        loading: false,
      });
    }, []);

  const contextValue = {
    ...state,
    refresh,
    logout,
  };

  return (
    <AuthContext.Provider
      value={contextValue}
    >
      {children}

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
        }}
      />
    </AuthContext.Provider>
  );
}