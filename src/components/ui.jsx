"use client";

import { useTranslation } from "react-i18next";

export function Loader({ label }) {
  return (
    <div className="flex items-center justify-center gap-3 py-6 text-sm text-gray-600">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      {label || "Loading..."}
    </div>
  );
}

export function Stars({ value = 0, size = "text-sm" }) {
  const full = Math.round(value);
  return (
    <span className={`${size} text-amber-500`} title={`${value} / 5`}>
      {"★".repeat(full)}
      <span className="text-gray-300">{"★".repeat(5 - full)}</span>
    </span>
  );
}

export function VerifiedBadge({ status }) {
  if (status === "approved")
    return (
      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
        ✓ Verified
      </span>
    );
  if (status === "rejected")
    return (
      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200">
        ✕ Rejected
      </span>
    );
  return (
    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
      ⏳ Pending
    </span>
  );
}

const STATUS_STYLE = {
  searching: "bg-slate-100 text-slate-700",
  assigned: "bg-blue-50 text-blue-700",
  on_the_way: "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-rose-50 text-rose-700",
};

export function StatusBadge({ status }) {
  const { t } = useTranslation();
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        STATUS_STYLE[status] || STATUS_STYLE.searching
      }`}
    >
      {t(`status.${status}`)}
    </span>
  );
}

export function StatusTimeline({ status }) {
  const { t } = useTranslation();
  const steps = ["searching", "assigned", "on_the_way", "completed"];
  const current = steps.indexOf(status);
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => (
        <div key={s} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full items-center">
            <div
              className={`h-1.5 w-full rounded-full ${
                i <= current ? "bg-teal-600" : "bg-gray-200"
              }`}
            />
          </div>
          <span
            className={`text-[10px] font-semibold ${
              i <= current ? "text-teal-700" : "text-gray-400"
            }`}
          >
            {t(`status.${s}`)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Avatar({ src, name, size = 44 }) {
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover ring-2 ring-teal-100"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-800"
    >
      {initials}
    </div>
  );
}
