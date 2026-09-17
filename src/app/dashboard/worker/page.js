"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

import { get, patch, post } from "@/lib/api";
import {
  SERVICES,
  serviceIcon,
  serviceLabel,
} from "@/lib/services";

import { useAuth } from "@/components/Providers";

import {
  Avatar,
  Loader,
  Stars,
  StatusBadge,
  VerifiedBadge,
} from "@/components/ui";

/**
 * Worker की profile image को छोटा base64 data URL बनाता है।
 */
function fileToSmallDataUrl(file, max = 256) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const scale = Math.min(
          max / image.width,
          max / image.height,
          1
        );

        const canvas = document.createElement("canvas");

        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        const context = canvas.getContext("2d");

        context.drawImage(
          image,
          0,
          0,
          canvas.width,
          canvas.height
        );

        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };

      image.onerror = reject;
      image.src = reader.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Date और time को India timezone में दिखाता है।
 */
function readableDateTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("hi-IN", {
    timeZone: "Asia/Kolkata",
  });
}

/**
 * Worker के लिए customer का payment plan दिखाता है।
 */
function paymentPlanLabel(job) {
  if (job.paymentStatus === "paid") {
    return "Payment received";
  }

  if (job.paymentPlan === "after_1_day") {
    return "काम के अगले दिन भुगतान";
  }

  if (job.paymentPlan === "after_2_days") {
    return "काम के 2 दिन बाद भुगतान";
  }

  if (job.paymentPlan === "after_3_days") {
    return "चुनी हुई तारीख को भुगतान";
  }

  return "काम पूरा होने के बाद भुगतान";
}

/**
 * Worker dashboard।
 */
export default function WorkerDashboard() {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const {
    user,
    loading: authLoading,
    refresh,
  } = useAuth();

  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [welfare, setWelfare] = useState(null);
  const [alerting, setAlerting] = useState(false);

  /**
   * Worker profile और bookings load करना।
   */
  const load = useCallback(async () => {
    try {
      const [workerResponse, bookingResponse, welfareResponse] = await Promise.all([
        get("/api/workers/me"),
        get("/api/bookings"),
        get("/api/worker/welfare"),
      ]);

      setProfile(workerResponse.worker);

      setVideoUrl(
        workerResponse.worker?.videoUrl || ""
      );

      setJobs(bookingResponse.bookings || []);
      setWelfare(welfareResponse);
    } catch (error) {
      toast.error(
        error.message || "Worker dashboard load नहीं हुआ।"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * केवल worker को dashboard खोलने दें।
   */
  useEffect(() => {
  if (authLoading) {
    return;
  }

  /*
   * Logout के बाद user null होगा,
   * इसलिए worker page से login पर भेजें।
   */
  if (
    !user ||
    user.role !== "worker"
  ) {
    router.replace("/login");
    return;
  }

  load();
}, [
  authLoading,
  user,
  router,
  load,
]);

  /**
   * Worker profile update करना।
   */
  const update = async (payload, message) => {
    setSaving(true);

    try {
      const data = await patch("/api/workers/me", payload);

      setProfile(data.worker);

      await refresh();

      if (message) {
        toast.success(message);
      }
    } catch (error) {
      toast.error(
        error.message || "Profile update नहीं हुआ।"
      );
    } finally {
      setSaving(false);
    }
  };

  /**
   * Worker profile photo upload।
   */
  const onPhoto = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const dataUrl = await fileToSmallDataUrl(file);

      await update(
        {
          photoUrl: dataUrl,
        },
        "Photo uploaded – sent for verification"
      );
    } catch {
      toast.error("Could not read that image");
    }
  };

  /**
   * Worker की current location update करना।
   */
  const pushLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        update(
          {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          "Location updated"
        ),

      () => toast.error("Could not read location")
    );
  };
  const sendEmergencyAlert = () => {
    if (!window.confirm("Send an emergency alert to the administrator?")) return;
    setAlerting(true);

    const send = async (lat, lng) => {
      try {
        const activeBooking = jobs.find((job) =>
          ["assigned", "on_the_way"].includes(job.status)
        );
        await post("/api/worker/emergency", {
          bookingId: activeBooking?.id || null,
          message: "Worker requested emergency assistance",
          lat,
          lng,
        });
        toast.success("Emergency alert sent to admin.");
        await load();
      } catch (error) {
        toast.error(error.message || "Emergency alert failed.");
      } finally {
        setAlerting(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => send(position.coords.latitude, position.coords.longitude),
        () => send(profile.lat, profile.lng)
      );
    } else {
      send(profile.lat, profile.lng);
    }
  };

  if (authLoading || loading) {
  return <Loader />;
}

/*
 * Logout और login redirect के बीच
 * worker dashboard render नहीं होगा।
 */
if (
  !user ||
  user.role !== "worker"
) {
  return null;
}

if (!profile) {
  return (
    <p className="py-10 text-center text-gray-500">
      Worker profile missing.
    </p>
  );
}

/*
 * Safe worker name।
 */
const workerName =
  user?.name ||
  profile?.name ||
  "Worker";

  const rating = profile.ratingCount
    ? Math.round(
        (profile.ratingSum / profile.ratingCount) * 10
      ) / 10
    : 0;

  /**
   * Worker की paid earnings।
   *
   * Pending payment को earnings में नहीं जोड़ते।
   */
  const paidEarnings = jobs
    .filter(
      (job) =>
        job.status === "completed" &&
        job.paymentStatus === "paid"
    )
    .reduce(
      (total, job) =>
        total + Number(job.price || 0),
      0
    );

  /**
   * Customer से अभी मिलने वाला pending amount।
   */
  const pendingEarnings = jobs
    .filter(
      (job) =>
        job.paymentStatus === "pending" &&
        job.status !== "cancelled"
    )
    .reduce(
      (total, job) =>
        total + Number(job.price || 0),
      0
    );

  const activeJobs = jobs.filter((job) =>
    ["assigned", "on_the_way"].includes(job.status)
  );

  return (
    <div className="space-y-6">
      {/* Worker header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar
            src={profile.photoUrl}
            name={workerName}
            size={52}
          />

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {workerName}
            </h1>

            <p className="flex items-center gap-2 text-sm text-gray-600">
              {serviceIcon(profile.service)}{" "}
              {serviceLabel(
                profile.service,
                i18n.language
              )}

              <VerifiedBadge
                status={profile.verification}
              />
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            update(
              {
                isOnline: !profile.isOnline,
              },
              profile.isOnline
                ? "You are offline"
                : "You are online"
            )
          }
          disabled={saving}
          className={`btn ${
            profile.isOnline
              ? "btn-primary"
              : "btn-ghost"
          }`}
        >
          {profile.isOnline
            ? `🟢 ${t("worker.online")}`
            : `⚪ ${t("worker.offline")}`}
        </button>
      </div>

      {/* Worker statistics */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat
          label={t("worker.jobs")}
          value={jobs.length}
        />

        <Stat
          label="Active"
          value={activeJobs.length}
        />

        <Stat
          label="Completed"
          value={profile.jobsDone || 0}
        />

        <Stat
          label="Paid earnings"
          value={`₹${paidEarnings}`}
        />

        <Stat
          label="Payment pending"
          value={`₹${pendingEarnings}`}
        />
      </div>

      <div className="card space-y-4 border-rose-100 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-gray-900">Worker Welfare & Safety</h2>
            <p className="text-sm text-gray-600">Insurance, emergency contact and live safety support.</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${
            profile.safetyStatus === "emergency"
              ? "bg-rose-100 text-rose-700"
              : "bg-emerald-100 text-emerald-700"
          }`}>
            {profile.safetyStatus === "emergency" ? "🚨 Emergency" : `🛡 ${profile.safetyStatus || "safe"}`}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-blue-50 p-3">
            <p className="text-xs text-gray-500">Verification</p>
            <p className="font-semibold text-blue-700">{profile.verification === "approved" || profile.isVerified ? "✅ Verified" : "⏳ Pending"}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3">
            <p className="text-xs text-gray-500">Insurance</p>
            <p className="font-semibold text-emerald-700">
              {profile.insuranceStatus === "active" ? "🛡 Active" : "Inactive"}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <label className="text-xs text-gray-500">Emergency contact</label>
            <input
              className="mt-1 w-full bg-transparent text-sm font-semibold outline-none"
              defaultValue={profile.emergencyContact || ""}
              placeholder="Phone number"
              onBlur={(event) =>
                update({ emergencyContact: event.target.value }, "Emergency contact updated")
              }
            />
          </div>
        </div>

        {welfare?.benefits?.length ? (
          <div className="grid gap-2 sm:grid-cols-3">
            {welfare.benefits.map((benefit) => (
              <div key={benefit.name} className="rounded-xl border border-gray-100 p-3 text-xs">
                <p className="font-bold text-gray-800">{benefit.name}</p>
                <p className="capitalize text-gray-500">{benefit.status}</p>
              </div>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          onClick={sendEmergencyAlert}
          disabled={alerting}
          className="w-full rounded-xl bg-red-600 px-4 py-4 text-lg font-bold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {alerting ? "Sending alert…" : "🚨 Send Emergency Alert"}
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        {/* Profile and verification */}
        <div className="card space-y-4 p-5">
          <h2 className="font-bold text-gray-900">
            {t("worker.profile")}
          </h2>

          <div className="flex items-center gap-3">
            <Avatar
              src={profile.photoUrl}
              name={workerName}
              size={60}
            />

            <label className="btn btn-ghost cursor-pointer">
              📷 {t("worker.upload")}

              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPhoto}
              />
            </label>
          </div>

          {/* Skill video */}
          <div>
            <label className="label">
              {t("worker.video")}
            </label>

            <div className="flex gap-2">
              <input
                className="input"
                placeholder="https://youtube.com/..."
                value={videoUrl}
                onChange={(event) =>
                  setVideoUrl(event.target.value)
                }
              />

              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  update(
                    {
                      videoUrl,
                    },
                    "Skill video submitted"
                  )
                }
                disabled={saving}
              >
                {t("app.save")}
              </button>
            </div>
          </div>

          {/* Service and price */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">
                {t("auth.service")}
              </label>

              <select
                className="input"
                value={profile.service}
                onChange={(event) =>
                  update(
                    {
                      service: event.target.value,
                    },
                    "Service updated"
                  )
                }
              >
                {SERVICES.map((service) => (
                  <option
                    key={service.key}
                    value={service.key}
                  >
                    {service.icon}{" "}
                    {serviceLabel(
                      service.key,
                      i18n.language
                    )}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">
                {t("auth.price")}
              </label>

              <input
                className="input"
                type="number"
                min="0"
                defaultValue={profile.pricePerHour}
                onBlur={(event) =>
                  update(
                    {
                      pricePerHour: event.target.value,
                    },
                    "Price updated"
                  )
                }
              />
            </div>
          </div>

          {/* Worker bio */}
          <div>
            <label className="label">Bio</label>

            <textarea
              className="input"
              rows={2}
              defaultValue={profile.bio}
              onBlur={(event) =>
                update(
                  {
                    bio: event.target.value,
                  },
                  "Bio updated"
                )
              }
            />
          </div>

          <button
            type="button"
            className="btn btn-ghost w-full"
            onClick={pushLocation}
            disabled={saving}
          >
            📍 Update my base location
          </button>

          <p className="rounded-xl bg-slate-50 p-3 text-xs text-gray-600">
            Verification status:{" "}
            <span className="font-semibold">
              {profile.verification === "approved"
                ? t("worker.verified")
                : profile.verification === "rejected"
                  ? t("worker.rejected")
                  : t("worker.pending")}
            </span>
            . Only verified workers appear in customer
            search and auto-assignment.
          </p>
        </div>

        {/* Worker jobs */}
        <div className="space-y-3">
          <h2 className="font-bold text-gray-900">
            {t("worker.jobs")}
          </h2>

          {activeJobs.length > 0 && (
            <div className="card border-teal-200 bg-teal-50/40 p-4 text-sm">
              <p className="font-semibold text-teal-800">
                {activeJobs.length} active job(s) – open
                one to share live location.
              </p>
            </div>
          )}

          {jobs.map((job) => (
            <div
              key={job.id}
              className="card flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900">
                  {serviceIcon(job.service)} #{job.id} ·{" "}
                  {job.customerName}
                </p>

                <p className="mt-1 text-xs text-gray-600">
                  {readableDateTime(job.scheduledAt)} · ₹
                  {job.price}

                  {job.isEmergency && (
                    <span className="ml-2 font-semibold text-rose-600">
                      🚨 Emergency
                    </span>
                  )}
                </p>

                {/* Payment information */}
                <div
                  className={`mt-2 rounded-xl px-3 py-2 text-xs ${
                    job.paymentStatus === "paid"
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-amber-50 text-amber-800"
                  }`}
                >
                  <p className="font-semibold">
                    {job.paymentStatus === "paid"
                      ? "✅ Payment received"
                      : `🕒 ${paymentPlanLabel(job)}`}
                  </p>

                  {job.paymentStatus !== "paid" &&
                    job.paymentDueAt && (
                      <p className="mt-1">
                        Payment due:{" "}
                        {readableDateTime(
                          job.paymentDueAt
                        )}
                      </p>
                    )}
                </div>

                {job.ratingStars ? (
                  <div className="mt-2">
                    <Stars value={job.ratingStars} />
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <StatusBadge status={job.status} />

                <Link
                  href={`/track/${job.id}`}
                  className="btn btn-primary !py-1.5"
                >
                  Open
                </Link>
              </div>
            </div>
          ))}

          {!jobs.length && (
            <p className="py-8 text-center text-sm text-gray-500">
              No jobs yet. Stay online to get assigned!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Dashboard statistics card।
 */
function Stat({ label, value }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p className="text-2xl font-extrabold text-gray-900">
        {value}
      </p>
    </div>
  );
}