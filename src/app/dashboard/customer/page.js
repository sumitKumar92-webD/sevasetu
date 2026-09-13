"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { get } from "@/lib/api";
import { serviceIcon, serviceLabel } from "@/lib/services";
import { useAuth } from "@/components/Providers";
import { Loader, Stars, StatusBadge } from "@/components/ui";

export default function CustomerDashboard() {
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    try {
      const data = await get("/api/bookings");
      setBookings(data.bookings || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
    if (user) load();
  }, [authLoading, user, router, load]);

  if (authLoading || loading) return <Loader />;
  if (!user) return null;

  const shown = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);
  const active = bookings.filter((b) => ["searching", "assigned", "on_the_way"].includes(b.status));
  const spent = bookings.filter((b) => b.status === "completed").reduce((s, b) => s + b.price, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">नमस्ते, {user.name} 👋</h1>
          <p className="text-sm text-gray-600">{t("booking.history")}</p>
        </div>
        <Link href="/book" className="btn btn-primary">
          ⚡ {t("nav.book")}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="Total bookings" value={bookings.length} />
        <Card label="Active" value={active.length} />
        <Card label="Completed" value={bookings.filter((b) => b.status === "completed").length} />
        <Card label="Total spent" value={`₹${spent}`} />
      </div>

      {active.length > 0 && (
        <div className="card space-y-3 border-teal-200 bg-teal-50/40 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Active job</p>
          {active.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">
                  {serviceIcon(b.service)} {serviceLabel(b.service, i18n.language)} ·{" "}
                  {b.workerName || "Searching…"}
                </p>
                <p className="text-xs text-gray-600">{new Date(b.scheduledAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={b.status} />
                <Link href={`/track/${b.id}`} className="btn btn-primary !py-1.5">
                  📍 {t("booking.track")}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {["all", "searching", "assigned", "on_the_way", "completed", "cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`btn !py-1 !px-3 text-xs ${filter === s ? "btn-primary" : "btn-ghost"}`}
          >
            {s === "all" ? t("app.all") : t(`status.${s}`)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {shown.map((b) => (
          <div key={b.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-semibold text-gray-900">
                {serviceIcon(b.service)} {serviceLabel(b.service, i18n.language)} #{b.id}
              </p>
              <p className="text-xs text-gray-600">
                {b.workerName || "—"} · {new Date(b.scheduledAt).toLocaleString()} · ₹{b.price}
                {b.isEmergency && <span className="ml-2 font-semibold text-rose-600">🚨</span>}
              </p>
              {b.ratingStars ? (
                <div className="mt-1 flex items-center gap-2">
                  <Stars value={b.ratingStars} />
                  <span className="text-xs text-gray-500">{t("booking.rated")}</span>
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={b.status} />
              <Link href={`/track/${b.id}`} className="btn btn-ghost !py-1.5">
                {b.status === "completed" && !b.ratingStars ? t("booking.rate") : t("booking.track")}
              </Link>
            </div>
          </div>
        ))}
        {!shown.length && <p className="py-10 text-center text-sm text-gray-500">{t("booking.empty")}</p>}
      </div>
    </div>
  );
}

function Card({ label, value }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-2xl font-extrabold text-gray-900">{value}</p>
    </div>
  );
}
