"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { useAuth } from "./Providers";

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const dashboardHref =
    user?.role === "admin"
      ? "/dashboard/admin"
      : user?.role === "worker"
      ? "/dashboard/worker"
      : "/dashboard/customer";

  const switchLang = () => {
    const next = i18n.language === "en" ? "hi" : "en";
    i18n.changeLanguage(next);
    localStorage.setItem("seva_lang", next);
  };

  const doLogout = async () => {
    await logout();
    toast.success("Logged out");
    router.push("/");
  };

  const links = (
    <>
      <Link href="/" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-teal-700">
        {t("nav.home")}
      </Link>
      <Link href="/workers" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-teal-700">
        {t("nav.services")}
      </Link>
      {user && (
        <Link href={dashboardHref} className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-teal-700">
          {t("nav.dashboard")}
        </Link>
      )}
      <button onClick={switchLang} className="btn btn-ghost !py-1.5 !px-3 text-xs">
        {i18n.language === "en" ? "हिंदी" : "English"}
      </button>
      {user ? (
        <>
          <Link href="/book" className="btn btn-primary !py-1.5">
            {t("nav.book")}
          </Link>
          <button onClick={doLogout} className="btn btn-ghost !py-1.5">
            {t("nav.logout")}
          </button>
        </>
      ) : (
        <>
          <Link href="/login" className="btn btn-ghost !py-1.5">
            {t("nav.login")}
          </Link>
          <Link href="/signup" className="btn btn-primary !py-1.5">
            {t("nav.signup")}
          </Link>
        </>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-lg text-white">
            🤝
          </span>
          <span>
            <span className="block text-base font-bold leading-4 text-teal-800">SevaSetu</span>
            <span className="block text-[10px] uppercase tracking-wider text-gray-500">
              {t("app.tagline")}
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">{links}</div>

        <button
          className="btn btn-ghost !px-3 !py-1.5 md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="menu"
        >
          ☰
        </button>
      </nav>
      {open && (
        <div className="flex flex-col items-stretch gap-2 border-t border-gray-200 px-4 py-3 md:hidden">
          {links}
        </div>
      )}
    </header>
  );
}
