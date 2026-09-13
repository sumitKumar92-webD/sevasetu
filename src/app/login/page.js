"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { post } from "@/lib/api";
import { useAuth } from "@/components/Providers";

const DEMO = [
  { label: "Customer", email: "customer@sevasetu.in" },
  { label: "Worker", email: "worker1@sevasetu.in" },
  { label: "Admin", email: "admin@sevasetu.in" },
];

export default function LoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { refresh } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await post("/api/auth/login", form);
      await refresh();
      toast.success(`Welcome, ${data.user.name}!`);
      const dest =
        data.user.role === "admin"
          ? "/dashboard/admin"
          : data.user.role === "worker"
          ? "/dashboard/worker"
          : "/dashboard/customer";
      router.push(dest);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <form onSubmit={submit} className="card space-y-4 p-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("auth.loginTitle")}</h1>
        <div>
          <label className="label">{t("auth.email")}</label>
          <input
            className="input"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label className="label">{t("auth.password")}</label>
          <input
            className="input"
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <button className="btn btn-primary w-full" disabled={loading}>
          {loading ? t("app.loading") : t("nav.login")}
        </button>

        <div className="rounded-xl bg-slate-50 p-3 text-xs text-gray-600">
          <p className="mb-2 font-semibold">{t("auth.demo")} (password: password123)</p>
          <div className="flex flex-wrap gap-2">
            {DEMO.map((d) => (
              <button
                key={d.email}
                type="button"
                className="btn btn-ghost !py-1 !px-2 text-[11px]"
                onClick={() => setForm({ email: d.email, password: "password123" })}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-sm text-gray-600">
          {t("auth.noAccount")}{" "}
          <Link href="/signup" className="font-semibold text-teal-700 hover:underline">
            {t("nav.signup")}
          </Link>
        </p>
      </form>
    </div>
  );
}
