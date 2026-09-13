"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { get, patch, post } from "@/lib/api";
import { distanceKm } from "@/lib/geo";
import { serviceIcon, serviceLabel } from "@/lib/services";
import MapView from "@/components/MapView";
import { useAuth } from "@/components/Providers";
import { Avatar, Loader, Stars, StatusBadge, StatusTimeline, VerifiedBadge } from "@/components/ui";

export default function TrackPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const router = useRouter();
  const { user, worker, loading: authLoading } = useAuth();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const watchRef = useRef(null);

  const isWorker = user?.role === "worker" && worker && booking?.workerId === worker.id;
  const isCustomer = user?.role === "customer" && booking?.customerId === user.id;

  const load = useCallback(async () => {
    try {
      const data = await get(`/api/bookings/${id}`);
      setBooking(data.booking);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    load();
  }, [load]);

  /* ---- live polling (3s) – the "socket channel" of this app --------- */
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        if (booking && booking.status === "on_the_way" && !sharing) {
          const data = await patch(`/api/bookings/${id}`, { action: "simulate" });
          setBooking(data.booking);
        } else {
          const data = await get(`/api/bookings/${id}`);
          setBooking(data.booking);
        }
      } catch {
        /* ignore transient errors */
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [id, booking, sharing]);

  /* ---- worker shares real GPS -------------------------------------- */
  const toggleShare = () => {
    if (sharing) {
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
      setSharing(false);
      return;
    }
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    watchRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        try {
          const data = await patch(`/api/bookings/${id}`, {
            action: "location",
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setBooking(data.booking);
        } catch {
          /* ignore */
        }
      },
      () => toast.error("Could not read your location"),
      { enableHighAccuracy: true }
    );
    setSharing(true);
    toast.success("Live location sharing on");
  };

  useEffect(() => {
    return () => {
      if (watchRef.current && navigator.geolocation) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  const setStatus = async (status) => {
    try {
      const data = await patch(`/api/bookings/${id}`, { status });
      setBooking(data.booking);
      toast.success(t(`status.${status}`));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const reassign = async () => {
    try {
      const data = await patch(`/api/bookings/${id}`, { action: "reassign" });
      setBooking(data.booking);
      toast.success("New worker assigned");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const submitRating = async () => {
    try {
      const data = await post(`/api/bookings/${id}/rate`, { stars, comment });
      setBooking(data.booking);
      toast.success(t("rating.thanks"));
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading || authLoading) return <Loader />;
  if (!booking) return <p className="py-10 text-center text-gray-500">Booking not found.</p>;

  const hasWorkerPos = booking.workerLat != null && booking.workerLng != null;
  const km = hasWorkerPos
    ? distanceKm(booking.workerLat, booking.workerLng, booking.customerLat, booking.customerLng)
    : null;
  const eta = km != null ? Math.max(1, Math.round((km / 22) * 60)) : null;

  const markers = [
    {
      lat: booking.customerLat,
      lng: booking.customerLng,
      emoji: "🏠",
      color: "#2563eb",
      label: t("track.you"),
    },
  ];
  if (hasWorkerPos) {
    markers.push({
      lat: booking.workerLat,
      lng: booking.workerLng,
      emoji: serviceIcon(booking.service),
      color: "#dc2626",
      label: `${booking.workerName} · ${km} km`,
    });
  }
  const line = hasWorkerPos
    ? [
        [booking.workerLat, booking.workerLng],
        [booking.customerLat, booking.customerLng],
      ]
    : null;

  const workerRating = booking.workerRatingCount
    ? Math.round((booking.workerRatingSum / booking.workerRatingCount) * 10) / 10
    : 4.2;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("track.title")} #{booking.id}
          </h1>
          <p className="text-sm text-gray-600">
            {serviceIcon(booking.service)} {serviceLabel(booking.service, i18n.language)}
            {booking.isEmergency && <span className="ml-2 font-semibold text-rose-600">🚨 Emergency</span>}
          </p>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      <div className="card p-4">
        <StatusTimeline status={booking.status} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-2">
          <MapView
            center={
              hasWorkerPos
                ? [(booking.workerLat + booking.customerLat) / 2, (booking.workerLng + booking.customerLng) / 2]
                : [booking.customerLat, booking.customerLng]
            }
            markers={markers}
            line={line}
            height={400}
            zoom={13}
          />
          <p className="text-center text-xs text-gray-500">🔄 {t("track.refresh")}</p>
        </div>

        <div className="space-y-4">
          <div className="card space-y-3 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
              {t("track.workerHere")}
            </p>
            {booking.workerId ? (
              <>
                <div className="flex items-center gap-3">
                  <Avatar src={booking.workerPhoto} name={booking.workerName} />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{booking.workerName}</p>
                      <VerifiedBadge status={booking.workerVerification} />
                    </div>
                    <Stars value={workerRating} />
                    <p className="text-xs text-gray-500">📞 {booking.workerPhone || "—"}</p>
                  </div>
                </div>
                {eta != null && booking.status !== "completed" && (
                  <div className="rounded-xl bg-teal-50 p-3 text-sm text-teal-800">
                    <span className="font-bold">{t("track.eta")}: {eta} {t("track.mins")}</span>
                    <span className="ml-2 text-teal-600">({km} km)</span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-600">⏳ Searching for an available pro…</p>
            )}

            <div className="space-y-1 border-t border-gray-100 pt-3 text-sm text-gray-600">
              <p>🗓 {new Date(booking.scheduledAt).toLocaleString()}</p>
              <p>📍 {booking.address || "Location pinned on map"}</p>
              {booking.notes && <p>📝 {booking.notes}</p>}
              <p className="font-semibold text-gray-900">💰 ₹{booking.price}</p>
            </div>
          </div>

          {/* Worker controls */}
          {isWorker && booking.status !== "completed" && booking.status !== "cancelled" && (
            <div className="card space-y-2 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Worker controls</p>
              {booking.status === "assigned" && (
                <button className="btn btn-primary w-full" onClick={() => setStatus("on_the_way")}>
                  🚗 {t("worker.start")}
                </button>
              )}
              {booking.status === "on_the_way" && (
                <button className="btn btn-primary w-full" onClick={() => setStatus("completed")}>
                  ✅ {t("worker.complete")}
                </button>
              )}
              <button className="btn btn-ghost w-full" onClick={toggleShare}>
                {sharing ? `⏹ ${t("worker.stopSharing")}` : `📡 ${t("worker.shareLocation")}`}
              </button>
            </div>
          )}

          {/* Customer controls */}
          {isCustomer && booking.status !== "completed" && booking.status !== "cancelled" && (
            <div className="card space-y-2 p-4">
              <button className="btn btn-ghost w-full" onClick={reassign}>
                🔁 Assign another worker
              </button>
              <button className="btn btn-danger w-full" onClick={() => setStatus("cancelled")}>
                ✕ {t("booking.cancel")}
              </button>
            </div>
          )}

          {/* Rating */}
          {isCustomer && booking.status === "completed" && (
            <div className="card space-y-3 p-4">
              <p className="font-semibold text-gray-900">{t("rating.title")}</p>
              {booking.ratingStars ? (
                <div className="space-y-1">
                  <Stars value={booking.ratingStars} size="text-lg" />
                  <p className="text-sm text-gray-600">{booking.ratingComment}</p>
                  <p className="text-xs font-semibold text-emerald-600">{t("rating.thanks")}</p>
                </div>
              ) : (
                <>
                  <div className="flex gap-1 text-2xl">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setStars(n)}
                        className={n <= stars ? "text-amber-500" : "text-gray-300"}
                        aria-label={`${n} stars`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="input"
                    rows={2}
                    placeholder={t("rating.comment")}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <button className="btn btn-primary w-full" onClick={submitRating}>
                    {t("rating.submit")}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
