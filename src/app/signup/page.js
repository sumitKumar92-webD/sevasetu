"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { post } from "@/lib/api";
import { useAuth } from "@/components/Providers";
import { SERVICES, serviceLabel } from "@/lib/services";

export default function SignupPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { refresh } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "customer",
    service: "electrician",
    pricePerHour: 350,
    experienceYears: 2,
  });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, language: i18n.language };
      if (navigator.geolocation) {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              payload.lat = pos.coords.latitude;
              payload.lng = pos.coords.longitude;
              resolve();
            },
            () => resolve(),
            { timeout: 4000 }
          );
        });
      }
      const data = await post("/api/auth/signup", payload);
      await refresh();
      toast.success("Account created!");
      router.push(
        data.user.role === "admin"
          ? "/dashboard/admin"
          : data.user.role === "worker"
          ? "/dashboard/worker"
          : "/dashboard/customer"
      );
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <form onSubmit={submit} className="card space-y-4 p-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("auth.signupTitle")}</h1>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t("auth.name")}</label>
            <input className="input" required value={form.name} onChange={set("name")} />
          </div>
          <div>
            <label className="label">{t("auth.phone")}</label>
            <input className="input" value={form.phone} onChange={set("phone")} />
          </div>
        </div>

        <div>
          <label className="label">{t("auth.email")}</label>
          <input className="input" type="email" required value={form.email} onChange={set("email")} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t("auth.password")}</label>
            <input
              className="input"
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={set("password")}
            />
          </div>
          <div>
            <label className="label">{t("auth.role")}</label>
            <select className="input" value={form.role} onChange={set("role")}>
              <option value="customer">{t("auth.customer")}</option>
              <option value="worker">{t("auth.worker")}</option>
              <option value="admin">{t("auth.admin")}</option>
            </select>
          </div>
        </div>

        {form.role === "worker" && (
          <div className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <label className="label">{t("auth.service")}</label>
              <select className="input" value={form.service} onChange={set("service")}>
                {SERVICES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.icon} {serviceLabel(s.key, i18n.language)}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">{t("auth.price")}</label>
              <input
                className="input"
                type="number"
                value={form.pricePerHour}
                onChange={set("pricePerHour")}
              />
            </div>
            <div>
              <label className="label">{t("auth.experience")}</label>
              <input
                className="input"
                type="number"
                value={form.experienceYears}
                onChange={set("experienceYears")}
              />
            </div>
          </div>
        )}

        <button className="btn btn-primary w-full" disabled={loading}>
          {loading ? t("app.loading") : t("nav.signup")}
        </button>

        <p className="text-center text-sm text-gray-600">
          {t("auth.haveAccount")}{" "}
          <Link href="/login" className="font-semibold text-teal-700 hover:underline">
            {t("nav.login")}
          </Link>
        </p>
      </form>
    </div>
  );
}
