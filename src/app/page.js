"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SERVICES, serviceLabel } from "@/lib/services";
import { get } from "@/lib/api";
import { Stars } from "@/components/ui";

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const [workers, setWorkers] = useState([]);

  useEffect(() => {
    get("/api/workers?sort=rating")
      .then((d) => setWorkers(d.workers || []))
      .catch(() => {});
  }, []);

  const avg =
    workers.length > 0
      ? (workers.reduce((s, w) => s + w.rating, 0) / workers.length).toFixed(1)
      : "4.6";

  return (
    <div className="space-y-12">
      {/* HERO */}
      <section className="grid gap-8 rounded-3xl bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-500 px-6 py-10 text-white md:grid-cols-2 md:px-10 md:py-14">
        <div className="space-y-5">
          <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            🇮🇳 {t("app.tagline")}
          </span>
          <h1 className="text-3xl font-extrabold leading-tight md:text-4xl">{t("home.heroTitle")}</h1>
          <p className="max-w-lg text-sm text-teal-50 md:text-base">{t("home.heroText")}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/book" className="btn bg-white text-teal-800 hover:bg-teal-50">
              ⚡ {t("home.cta")}
            </Link>
            <Link href="/workers" className="btn border border-white/50 bg-white/10 text-white hover:bg-white/20">
              {t("home.browse")}
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 self-center">
          <Stat value={workers.length} label={t("home.stat1")} />
          <Stat value={SERVICES.length} label={t("home.stat2")} />
          <Stat value={avg} label={t("home.stat3")} />
        </div>
      </section>

      {/* SERVICES */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">{t("home.popular")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {SERVICES.map((s) => (
            <Link
              key={s.key}
              href={`/book?service=${s.key}`}
              className="card flex flex-col items-center gap-2 p-4 text-center transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="text-2xl">{s.icon}</span>
              <span className="text-sm font-semibold text-gray-800">
                {serviceLabel(s.key, i18n.language)}
              </span>
              <span className="text-[11px] text-gray-500">₹{s.base}/hr</span>
            </Link>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">{t("home.how")}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="card space-y-2 p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white">
                {n}
              </span>
              <h3 className="font-semibold text-gray-900">{t(`home.step${n}`)}</h3>
              <p className="text-sm text-gray-600">{t(`home.step${n}d`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TOP WORKERS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">⭐ Top rated pros</h2>
          <Link href="/workers" className="text-sm font-semibold text-teal-700 hover:underline">
            View all →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {workers.slice(0, 4).map((w) => (
            <div key={w.id} className="card p-4">
              <p className="font-semibold text-gray-900">{w.name}</p>
              <p className="text-xs text-gray-500">{serviceLabel(w.service, i18n.language)}</p>
              <div className="mt-2 flex items-center justify-between">
                <Stars value={w.rating} />
                <span className="text-xs font-semibold text-teal-700">₹{w.pricePerHour}/hr</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div className="rounded-2xl bg-white/15 p-4 text-center backdrop-blur">
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-teal-50">{label}</p>
    </div>
  );
}
