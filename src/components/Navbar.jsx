"use client";

import Link from "next/link";

import {
  useRouter,
} from "next/navigation";

import {
  useState,
} from "react";

import {
  useTranslation,
} from "react-i18next";

import toast from "react-hot-toast";

import {
  useAuth,
} from "./Providers";

import {
  LANGUAGES,
  isRightToLeft,
} from "@/i18n/languages";

export default function Navbar() {
  const {
    t,
    i18n,
  } = useTranslation();

  const {
    user,
    logout,
  } = useAuth();

  const router = useRouter();

  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] = useState(false);

  const dashboardHref =
    user?.role === "admin"
      ? "/dashboard/admin"
      : user?.role ===
          "worker"
        ? "/dashboard/worker"
        : "/dashboard/customer";

  const changeLanguage =
    async (languageCode) => {
      await i18n.changeLanguage(
        languageCode
      );

      localStorage.setItem(
        "seva_lang",
        languageCode
      );

      document.documentElement.lang =
        languageCode;

      document.documentElement.dir =
        isRightToLeft(
          languageCode
        )
          ? "rtl"
          : "ltr";
    };

  const doLogout =
    async () => {
      try {
        await logout();

        toast.success(
          t("nav.logout")
        );

        router.push("/");
      } catch (error) {
        toast.error(
          error.message
        );
      }
    };

  const navigationLinks = (
    <>
      <Link
        href="/"
        className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-teal-700"
        onClick={() =>
          setMobileMenuOpen(
            false
          )
        }
      >
        {t("nav.home")}
      </Link>

      <Link
        href="/workers"
        className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-teal-700"
        onClick={() =>
          setMobileMenuOpen(
            false
          )
        }
      >
        {t("nav.services")}
      </Link>

      {user && (
        <Link
          href={
            dashboardHref
          }
          className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-teal-700"
          onClick={() =>
            setMobileMenuOpen(
              false
            )
          }
        >
          {t(
            "nav.dashboard"
          )}
        </Link>
      )}

      <select
        aria-label="Choose language"
        className="input !w-auto !px-2 !py-1.5 text-xs"
        value={
          i18n.resolvedLanguage ||
          i18n.language ||
          "en"
        }
        onChange={(event) =>
          changeLanguage(
            event.target.value
          )
        }
      >
        {LANGUAGES.map(
          (language) => (
            <option
              key={
                language.code
              }
              value={
                language.code
              }
            >
              {
                language.nativeName
              }
            </option>
          )
        )}
      </select>

      {user ? (
        <>
          <Link
            href="/book"
            className="btn btn-primary !py-1.5"
            onClick={() =>
              setMobileMenuOpen(
                false
              )
            }
          >
            {t("nav.book")}
          </Link>

          <button
            type="button"
            onClick={doLogout}
            className="btn btn-ghost !py-1.5"
          >
            {t("nav.logout")}
          </button>
        </>
      ) : (
        <>
          <Link
            href="/login"
            className="btn btn-ghost !py-1.5"
            onClick={() =>
              setMobileMenuOpen(
                false
              )
            }
          >
            {t("nav.login")}
          </Link>

          <Link
            href="/signup"
            className="btn btn-primary !py-1.5"
            onClick={() =>
              setMobileMenuOpen(
                false
              )
            }
          >
            {t("nav.signup")}
          </Link>
        </>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-lg text-white">
            🤝
          </span>

          <span>
            <span className="block text-base font-bold leading-4 text-teal-800">
              {t("app.name")}
            </span>

            <span className="block text-[10px] uppercase tracking-wider text-gray-500">
              {t(
                "app.tagline"
              )}
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navigationLinks}
        </div>

        <button
          type="button"
          className="btn btn-ghost !px-3 !py-1.5 md:hidden"
          aria-label="Open menu"
          onClick={() =>
            setMobileMenuOpen(
              (current) =>
                !current
            )
          }
        >
          ☰
        </button>
      </nav>

      {mobileMenuOpen && (
        <div className="flex flex-col items-stretch gap-2 border-t border-gray-200 px-4 py-3 md:hidden">
          {navigationLinks}
        </div>
      )}
    </header>
  );
}