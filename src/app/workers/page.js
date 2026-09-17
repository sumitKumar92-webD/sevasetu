"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { get } from "@/lib/api";
import { SERVICES, serviceLabel, serviceIcon } from "@/lib/services";
import useGeo from "@/hooks/useGeo";
import MapView from "@/components/MapView";
import { Avatar, Loader, Stars, VerifiedBadge } from "@/components/ui";

export default function WorkersPage() {
  const { t, i18n } = useTranslation();
  const { coords, locate, locating } = useGeo(true);
  const [filters, setFilters] = useState({
    service: "",
    sort: "smart",
    q: "",
    location: "delhi",
    onlineOnly: false,
  });
  const [workers, setWorkers] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      service: filters.service,
      sort: filters.sort,
      q: filters.q,
      onlineOnly: String(filters.onlineOnly),
      lat: String(coords.lat),
      lng: String(coords.lng),
    });
    try {
      const recommendationParams = new URLSearchParams({
        service: filters.service,
        location: filters.location,
        lat: String(coords.lat),
        lng: String(coords.lng),
      });
      const [data, recommendation] = await Promise.all([
        get(`/api/workers?${params.toString()}`),
        get(`/api/ai/recommend-workers?${recommendationParams.toString()}`),
      ]);
      setWorkers(data.workers || []);
      setForecast(recommendation);
    } finally {
      setLoading(false);
    }
  }, [filters, coords]);

  useEffect(() => {
    load();
  }, [load]);

  const markers = [
    { lat: coords.lat, lng: coords.lng, emoji: "🏠", color: "#2563eb", label: t("track.you") },
    ...workers.slice(0, 25).map((w) => ({
      lat: w.lat,
      lng: w.lng,
      emoji: serviceIcon(w.service),
      label: `${w.name} · ⭐ ${w.rating} · ${w.distance} km`,
    })),
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("nav.services")}</h1>
          <p className="text-sm text-gray-600">
            {workers.length} pros near you · {coords.lat.toFixed(3)}, {coords.lng.toFixed(3)}
          </p>
          {forecast?.demand?.highDemandArea && (
            <span className="mt-2 inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">
              🔥 High Demand Area · {forecast.requestedService}
            </span>
          )}
        </div>
        <button className="btn btn-ghost" onClick={locate} disabled={locating}>
          📍 {locating ? t("app.loading") : t("booking.useLocation")}
        </button>
      </div>

      <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="label">{t("app.search")}</label>
          <input
            className="input"
            placeholder="Name or service..."
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          />
        </div>
        <div>
          <label className="label">{t("booking.service")}</label>
          <select
            className="input"
            value={filters.service}
            onChange={(e) => setFilters({ ...filters, service: e.target.value })}
          >
            <option value="">{t("app.all")}</option>
            {SERVICES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.icon} {serviceLabel(s.key, i18n.language)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Location</label>
          <input
            className="input"
            placeholder="Delhi"
            value={filters.location}
            onChange={(e) => setFilters({ ...filters, location: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Sort by</label>
          <select
            className="input"
            value={filters.sort}
            onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
          >
            <option value="smart">🤖 Smart match</option>
            <option value="distance">📍 Distance</option>
            <option value="rating">⭐ Rating</option>
            <option value="availability">🟢 Availability</option>
            <option value="price">₹ Price</option>
          </select>
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={filters.onlineOnly}
            onChange={(e) => setFilters({ ...filters, onlineOnly: e.target.checked })}
          />
          Online only
        </label>
      </div>

      <MapView center={[coords.lat, coords.lng]} markers={markers} height={320} />

      {loading ? (
        <Loader label={t("app.loading")} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {workers.map((w) => (
            <div key={w.id} className="card space-y-3 p-4">
              <div className="flex items-start gap-3">
                <Avatar src={w.photoUrl} name={w.name} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{w.name}</p>
                    <VerifiedBadge status={w.verification} />
                  </div>
                  <p className="text-xs text-gray-500">
                    {serviceIcon(w.service)} {serviceLabel(w.service, i18n.language)} ·{" "}
                    {w.experienceYears} yrs
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <Stars value={w.rating} />
                    <span className="text-gray-500">({w.ratingCount})</span>
                    <span className={w.isOnline ? "text-emerald-600" : "text-gray-400"}>
                      ● {w.isOnline ? t("worker.online") : t("worker.offline")}
                    </span>
                  </div>
                </div>
              </div>
              {forecast?.recommendedWorker?.id === w.id && (
                <span className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
                  ⭐ Recommended Worker
                </span>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">📍 {w.distance} km {t("worker.distance")}</span>
                <span className="font-semibold text-teal-700">₹{w.pricePerHour}/hr</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-teal-50 px-2 py-1 text-[11px] font-semibold text-teal-700">
                  Match score {w.score}
                </span>
                <Link href={`/book?service=${w.service}&worker=${w.id}`} className="btn btn-primary !py-1.5">
                  {t("nav.book")}
                </Link>
              </div>
            </div>
          ))}
          {!workers.length && (
            <p className="col-span-full py-8 text-center text-sm text-gray-500">
              No workers found for this filter.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
