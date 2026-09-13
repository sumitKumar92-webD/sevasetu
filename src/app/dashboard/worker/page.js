"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { get, patch } from "@/lib/api";
import { SERVICES, serviceIcon, serviceLabel } from "@/lib/services";
import { useAuth } from "@/components/Providers";
import { Avatar, Loader, Stars, StatusBadge, VerifiedBadge } from "@/components/ui";

/** Shrink an image file into a small base64 data-url (fake "upload"). */
function fileToSmallDataUrl(file, max = 256) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(max / img.width, max / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function WorkerDashboard() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user, worker, loading: authLoading, refresh } = useAuth();
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");

  const load = useCallback(async () => {
    try {
      const [me, list] = await Promise.all([get("/api/workers/me"), get("/api/bookings")]);
      setProfile(me.worker);
      setVideoUrl(me.worker?.videoUrl || "");
      setJobs(list.bookings || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "worker")) router.push("/login");
    if (user?.role === "worker") load();
  }, [authLoading, user, router, load]);

  const update = async (payload, msg) => {
    setSaving(true);
    try {
      const data = await patch("/api/workers/me", payload);
      setProfile(data.worker);
      await refresh();
      if (msg) toast.success(msg);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToSmallDataUrl(file);
      await update({ photoUrl: dataUrl }, "Photo uploaded – sent for verification");
    } catch {
      toast.error("Could not read that image");
    }
  };

  const pushLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      (pos) => update({ lat: pos.coords.latitude, lng: pos.coords.longitude }, "Location updated"),
      () => toast.error("Could not read location")
    );
  };

  if (authLoading || loading) return <Loader />;
  if (!profile) return <p className="py-10 text-center text-gray-500">Worker profile missing.</p>;

  const rating = profile.ratingCount
    ? Math.round((profile.ratingSum / profile.ratingCount) * 10) / 10
    : 0;
  const earnings = jobs.filter((j) => j.status === "completed").reduce((s, j) => s + j.price, 0);
  const activeJobs = jobs.filter((j) => ["assigned", "on_the_way"].includes(j.status));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar src={profile.photoUrl} name={user.name} size={52} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
            <p className="flex items-center gap-2 text-sm text-gray-600">
              {serviceIcon(profile.service)} {serviceLabel(profile.service, i18n.language)}
              <VerifiedBadge status={profile.verification} />
            </p>
          </div>
        </div>

        <button
          onClick={() => update({ isOnline: !profile.isOnline }, profile.isOnline ? "You are offline" : "You are online")}
          disabled={saving}
          className={`btn ${profile.isOnline ? "btn-primary" : "btn-ghost"}`}
        >
          {profile.isOnline ? `🟢 ${t("worker.online")}` : `⚪ ${t("worker.offline")}`}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t("worker.jobs")} value={jobs.length} />
        <Stat label="Completed" value={profile.jobsDone} />
        <Stat label={t("worker.earnings")} value={`₹${earnings}`} />
        <Stat label={t("worker.rating")} value={rating || "—"} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        {/* Profile & verification */}
        <div className="card space-y-4 p-5">
          <h2 className="font-bold text-gray-900">{t("worker.profile")}</h2>

          <div className="flex items-center gap-3">
            <Avatar src={profile.photoUrl} name={user.name} size={60} />
            <label className="btn btn-ghost cursor-pointer">
              📷 {t("worker.upload")}
              <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
            </label>
          </div>

          <div>
            <label className="label">{t("worker.video")}</label>
            <div className="flex gap-2">
              <input
                className="input"
                placeholder="https://youtube.com/..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
              <button
                className="btn btn-primary"
                onClick={() => update({ videoUrl }, "Skill video submitted")}
                disabled={saving}
              >
                {t("app.save")}
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">{t("auth.service")}</label>
              <select
                className="input"
                value={profile.service}
                onChange={(e) => update({ service: e.target.value }, "Service updated")}
              >
                {SERVICES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.icon} {serviceLabel(s.key, i18n.language)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t("auth.price")}</label>
              <input
                className="input"
                type="number"
                defaultValue={profile.pricePerHour}
                onBlur={(e) => update({ pricePerHour: e.target.value }, "Price updated")}
              />
            </div>
          </div>

          <div>
            <label className="label">Bio</label>
            <textarea
              className="input"
              rows={2}
              defaultValue={profile.bio}
              onBlur={(e) => update({ bio: e.target.value }, "Bio updated")}
            />
          </div>

          <button className="btn btn-ghost w-full" onClick={pushLocation}>
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
            . Only verified workers appear in customer search and auto-assignment.
          </p>
        </div>

        {/* Jobs */}
        <div className="space-y-3">
          <h2 className="font-bold text-gray-900">{t("worker.jobs")}</h2>
          {activeJobs.length > 0 && (
            <div className="card border-teal-200 bg-teal-50/40 p-4 text-sm">
              <p className="font-semibold text-teal-800">
                {activeJobs.length} active job(s) – open one to share live location.
              </p>
            </div>
          )}
          {jobs.map((j) => (
            <div key={j.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold text-gray-900">
                  {serviceIcon(j.service)} #{j.id} · {j.customerName}
                </p>
                <p className="text-xs text-gray-600">
                  {new Date(j.scheduledAt).toLocaleString()} · ₹{j.price}
                  {j.isEmergency && <span className="ml-2 font-semibold text-rose-600">🚨</span>}
                </p>
                {j.ratingStars ? <Stars value={j.ratingStars} /> : null}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={j.status} />
                <Link href={`/track/${j.id}`} className="btn btn-primary !py-1.5">
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

function Stat({ label, value }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-2xl font-extrabold text-gray-900">{value}</p>
    </div>
  );
}
