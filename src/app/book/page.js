"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { get, post } from "@/lib/api";
import { SERVICES, serviceLabel, serviceIcon } from "@/lib/services";
import useGeo from "@/hooks/useGeo";
import MapView from "@/components/MapView";
import { useAuth } from "@/components/Providers";
import { Loader, Stars, VerifiedBadge } from "@/components/ui";

function BookingForm() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { coords, locate, locating } = useGeo(true);

  const [form, setForm] = useState({
    service: params.get("service") || "electrician",
    scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
    notes: "",
    address: "",
    workerId: params.get("worker") || "",
    isEmergency: false,
  });
  const [candidates, setCandidates] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  const loadCandidates = useCallback(async () => {
    const qs = new URLSearchParams({
      service: form.service,
      sort: "smart",
      lat: String(coords.lat),
      lng: String(coords.lng),
    });
    try {
      const data = await get(`/api/workers?${qs.toString()}`);
      setCandidates(data.workers || []);
    } catch {
      setCandidates([]);
    }
  }, [form.service, coords]);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const submit = async (e, emergency = false) => {
    if (e) e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        isEmergency: emergency || form.isEmergency,
        workerId: form.workerId ? Number(form.workerId) : null,
        lat: coords.lat,
        lng: coords.lng,
      };
      const data = await post("/api/bookings", payload);
      if (data.matched) {
        toast.success(`${t("booking.created")} ${data.matched.name} (${data.matched.distance} km)`);
      } else {
        toast("No worker online right now — still searching.", { icon: "⏳" });
      }
      router.push(`/track/${data.booking.id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return <Loader />;

  const best = candidates[0];

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <form onSubmit={(e) => submit(e, false)} className="card space-y-4 p-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("booking.title")}</h1>

        <div>
          <label className="label">{t("booking.service")}</label>
          <select
            className="input"
            value={form.service}
            onChange={(e) => setForm({ ...form, service: e.target.value, workerId: "" })}
          >
            {SERVICES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.icon} {serviceLabel(s.key, i18n.language)} · ₹{s.base}/hr
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t("booking.datetime")}</label>
            <input
              className="input"
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
            />
          </div>
          <div>
            <label className="label">{t("booking.chooseWorker")}</label>
            <select
              className="input"
              value={form.workerId}
              onChange={(e) => setForm({ ...form, workerId: e.target.value })}
            >
              <option value="">🤖 {t("booking.auto")}</option>
              {candidates.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} · ⭐{w.rating} · {w.distance} km
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">{t("booking.address")}</label>
          <input
            className="input"
            placeholder="House no, street, landmark"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>

        <div>
          <label className="label">
            {t("booking.notes")} ({t("app.optional")})
          </label>
          <textarea
            className="input"
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
          <span className="text-sm text-gray-600">
            📍 {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
          </span>
          <button type="button" className="btn btn-ghost !py-1.5" onClick={locate} disabled={locating}>
            {locating ? t("app.loading") : t("booking.useLocation")}
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button className="btn btn-primary flex-1" disabled={submitting}>
            {submitting ? t("booking.finding") : `🤖 ${t("booking.submit")}`}
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={submitting}
            onClick={() => submit(null, true)}
          >
            🚨 {t("booking.emergency")}
          </button>
        </div>
        {submitting && <Loader label={t("booking.finding")} />}
      </form>

      <div className="space-y-4">
        <MapView
          center={[coords.lat, coords.lng]}
          height={260}
          markers={[
            { lat: coords.lat, lng: coords.lng, emoji: "🏠", color: "#2563eb", label: t("track.you") },
            ...candidates.slice(0, 10).map((w) => ({
              lat: w.lat,
              lng: w.lng,
              emoji: serviceIcon(w.service),
              label: `${w.name} · ${w.distance} km`,
            })),
          ]}
        />

        {best && (
          <div className="card space-y-2 border-teal-200 bg-teal-50/40 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
              🤖 Smart match suggestion
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{best.name}</p>
                <p className="text-xs text-gray-600">
                  {best.distance} km · ₹{best.pricePerHour}/hr · score {best.score}
                </p>
              </div>
              <div className="text-right">
                <Stars value={best.rating} />
                <div className="mt-1">
                  <VerifiedBadge status={best.verification} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="card p-4 text-xs text-gray-600">
          <p className="mb-1 font-semibold text-gray-800">How assignment works</p>
          <p>
            Score = distance (50) + rating (35) + availability (10) + experience (5). Emergency
            bookings prioritise the nearest online pro and add a 25% surge.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={<Loader />}>
      <BookingForm />
    </Suspense>
  );
}
