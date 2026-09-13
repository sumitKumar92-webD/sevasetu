"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { get, patch } from "@/lib/api";
import { serviceIcon, serviceLabel } from "@/lib/services";
import { useAuth } from "@/components/Providers";
import { Avatar, Loader, Stars, StatusBadge, VerifiedBadge } from "@/components/ui";

export default function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");

  const load = useCallback(async () => {
    try {
      const [s, w, b] = await Promise.all([
        get("/api/admin/stats"),
        get("/api/admin/workers"),
        get("/api/bookings"),
      ]);
      setStats(s.stats);
      setWorkers(w.workers || []);
      setBookings(b.bookings || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) router.push("/login");
    if (user?.role === "admin") load();
  }, [authLoading, user, router, load]);

  const decide = async (id, verification) => {
    try {
      await patch(`/api/admin/workers/${id}`, { verification });
      toast.success(verification === "approved" ? "Worker approved ✓" : "Worker rejected");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (authLoading || loading || !stats) return <Loader />;

  const pending = workers.filter((w) => w.verification === "pending");
  const shownWorkers = tab === "pending" ? pending : workers;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t("admin.dashboard")}</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <Stat label={t("admin.users")} value={stats.totalUsers} />
        <Stat label={t("admin.workers")} value={stats.totalWorkers} />
        <Stat label="Online now" value={stats.online} />
        <Stat label={t("admin.bookings")} value={stats.totalBookings} />
        <Stat label={t("admin.revenue")} value={`₹${stats.revenue}`} />
        <Stat label="Avg rating" value={stats.avgRating || "—"} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MiniCard title={t("admin.pending")} value={stats.pending} tone="amber" />
        <MiniCard title="Verified workers" value={stats.approved} tone="emerald" />
        <MiniCard title="Emergency bookings" value={stats.emergency} tone="rose" />
      </div>

      {/* Bookings per service */}
      <div className="card p-4">
        <p className="mb-3 text-sm font-bold text-gray-900">Bookings per service</p>
        <div className="space-y-2">
          {stats.byService.length ? (
            stats.byService.map((row) => {
              const max = Math.max(...stats.byService.map((r) => r.n));
              return (
                <div key={row.service} className="flex items-center gap-3 text-xs">
                  <span className="w-36 shrink-0 text-gray-700">
                    {serviceIcon(row.service)} {serviceLabel(row.service, i18n.language)}
                  </span>
                  <div className="h-2 flex-1 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-teal-600"
                      style={{ width: `${(row.n / max) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 text-right font-semibold text-gray-700">{row.n}</span>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-gray-500">No bookings yet.</p>
          )}
        </div>
      </div>

      {/* Verifications */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-900">{t("admin.verifications")}</h2>
          <button
            className={`btn !py-1 !px-3 text-xs ${tab === "pending" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab("pending")}
          >
            {t("admin.pending")} ({pending.length})
          </button>
          <button
            className={`btn !py-1 !px-3 text-xs ${tab === "all" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab("all")}
          >
            {t("app.all")} ({workers.length})
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {shownWorkers.map((w) => (
            <div key={w.id} className="card space-y-3 p-4">
              <div className="flex items-start gap-3">
                <Avatar src={w.photoUrl} name={w.name} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{w.name}</p>
                    <VerifiedBadge status={w.verification} />
                  </div>
                  <p className="text-xs text-gray-500">
                    {serviceIcon(w.service)} {serviceLabel(w.service, i18n.language)} · ₹
                    {w.pricePerHour}/hr · {w.experienceYears} yrs
                  </p>
                  <Stars value={w.rating} />
                  <p className="text-xs text-gray-500">{w.email}</p>
                </div>
              </div>
              {w.videoUrl ? (
                <a
                  href={w.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-xs font-semibold text-teal-700 hover:underline"
                >
                  ▶ Skill video: {w.videoUrl}
                </a>
              ) : (
                <p className="text-xs text-gray-400">No skill video uploaded</p>
              )}
              <div className="flex gap-2">
                <button className="btn btn-primary flex-1 !py-1.5" onClick={() => decide(w.id, "approved")}>
                  ✓ {t("admin.approve")}
                </button>
                <button className="btn btn-danger flex-1 !py-1.5" onClick={() => decide(w.id, "rejected")}>
                  ✕ {t("admin.reject")}
                </button>
              </div>
            </div>
          ))}
          {!shownWorkers.length && (
            <p className="py-6 text-sm text-gray-500">Nothing pending — all caught up! 🎉</p>
          )}
        </div>
      </div>

      {/* All bookings */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">{t("admin.allBookings")}</h2>
        <div className="card divide-y divide-gray-100">
          {bookings.slice(0, 20).map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <span className="font-semibold text-gray-900">
                #{b.id} {serviceIcon(b.service)} {serviceLabel(b.service, i18n.language)}
              </span>
              <span className="text-xs text-gray-600">
                {b.customerName} → {b.workerName || "—"}
              </span>
              <span className="text-xs text-gray-600">₹{b.price}</span>
              <StatusBadge status={b.status} />
              <Link href={`/track/${b.id}`} className="text-xs font-semibold text-teal-700 hover:underline">
                view
              </Link>
            </div>
          ))}
          {!bookings.length && <p className="p-4 text-sm text-gray-500">No bookings yet.</p>}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card p-4">
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-xl font-extrabold text-gray-900">{value}</p>
    </div>
  );
}

function MiniCard({ title, value, tone }) {
  const tones = {
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    emerald: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    rose: "bg-rose-50 text-rose-800 ring-rose-200",
  };
  return (
    <div className={`rounded-2xl p-4 ring-1 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide">{title}</p>
      <p className="text-2xl font-extrabold">{value}</p>
    </div>
  );
}
