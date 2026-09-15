"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  useTranslation,
} from "react-i18next";

import {
  get,
} from "@/lib/api";

import {
  serviceIcon,
  serviceLabel,
} from "@/lib/services";

import {
  useAuth,
} from "@/components/Providers";

import {
  Loader,
  Stars,
  StatusBadge,
} from "@/components/ui";

function readableDateTime(
  value
) {
  if (!value) {
    return "";
  }

  return new Date(
    value
  ).toLocaleString(
    "hi-IN",
    {
      timeZone:
        "Asia/Kolkata",
    }
  );
}

export default function CustomerDashboard() {
  const {
    t,
    i18n,
  } = useTranslation();

  const {
    user,
    loading: authLoading,
  } = useAuth();

  const router =
    useRouter();

  const [
    bookings,
    setBookings,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    filter,
    setFilter,
  ] = useState("all");

  const load =
    useCallback(
      async () => {
        try {
          const data =
            await get(
              "/api/bookings"
            );

          setBookings(
            data.bookings ||
              []
          );
        } catch {
          setBookings([]);
        } finally {
          setLoading(
            false
          );
        }
      },
      []
    );

  useEffect(() => {
    if (
      !authLoading &&
      !user
    ) {
      router.push(
        "/login"
      );
    }

    if (user) {
      load();
    }
  }, [
    authLoading,
    user,
    router,
    load,
  ]);

  if (
    authLoading ||
    loading
  ) {
    return <Loader />;
  }

  if (!user) {
    return null;
  }

  const shown =
    filter === "all"
      ? bookings
      : bookings.filter(
          (booking) =>
            booking.status ===
            filter
        );

  const active =
    bookings.filter(
      (booking) =>
        [
          "searching",
          "assigned",
          "on_the_way",
        ].includes(
          booking.status
        )
    );

  /*
   * केवल paid bookings को total spent में जोड़ें।
   */
  const spent =
    bookings
      .filter(
        (booking) =>
          booking.paymentStatus ===
          "paid"
      )
      .reduce(
        (
          total,
          booking
        ) =>
          total +
          Number(
            booking.price ||
              0
          ),
        0
      );

  const pendingPayment =
    bookings
      .filter(
        (booking) =>
          booking.paymentStatus ===
          "pending"
      )
      .reduce(
        (
          total,
          booking
        ) =>
          total +
          Number(
            booking.price ||
              0
          ),
        0
      );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            नमस्ते,{" "}
            {
              user.name
            }{" "}
            👋
          </h1>

          <p className="text-sm text-gray-600">
            {t(
              "booking.history"
            )}
          </p>
        </div>

        <Link
          href="/book"
          className="btn btn-primary"
        >
          ⚡{" "}
          {t(
            "nav.book"
          )}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <DashboardCard
          label="Total bookings"
          value={
            bookings.length
          }
        />

        <DashboardCard
          label="Active"
          value={
            active.length
          }
        />

        <DashboardCard
          label="Completed"
          value={
            bookings.filter(
              (booking) =>
                booking.status ===
                "completed"
            ).length
          }
        />

        <DashboardCard
          label="Total paid"
          value={`₹${spent}`}
        />

        <DashboardCard
          label="Payment pending"
          value={`₹${pendingPayment}`}
        />
      </div>

      {active.length > 0 && (
        <div className="card space-y-3 border-teal-200 bg-teal-50/40 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
            Active job
          </p>

          {active.map(
            (booking) => (
              <div
                key={
                  booking.id
                }
                className="flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <p className="font-semibold text-gray-900">
                    {serviceIcon(
                      booking.service
                    )}{" "}
                    {serviceLabel(
                      booking.service,
                      i18n.language
                    )}{" "}
                    ·{" "}
                    {booking.workerName ||
                      "Searching…"}
                  </p>

                  <p className="text-xs text-gray-600">
                    {readableDateTime(
                      booking.scheduledAt
                    )}
                  </p>

                  <PaymentStatus
                    booking={
                      booking
                    }
                  />
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge
                    status={
                      booking.status
                    }
                  />

                  <Link
                    href={`/track/${booking.id}`}
                    className="btn btn-primary !py-1.5"
                  >
                    📍{" "}
                    {t(
                      "booking.track"
                    )}
                  </Link>
                </div>
              </div>
            )
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {[
          "all",
          "searching",
          "assigned",
          "on_the_way",
          "completed",
          "cancelled",
        ].map(
          (status) => (
            <button
              key={
                status
              }
              type="button"
              onClick={() =>
                setFilter(
                  status
                )
              }
              className={`btn !px-3 !py-1 text-xs ${
                filter ===
                status
                  ? "btn-primary"
                  : "btn-ghost"
              }`}
            >
              {status ===
              "all"
                ? t(
                    "app.all"
                  )
                : t(
                    `status.${status}`
                  )}
            </button>
          )
        )}
      </div>

      <div className="space-y-3">
        {shown.map(
          (booking) => (
            <div
              key={
                booking.id
              }
              className="card flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div>
                <p className="font-semibold text-gray-900">
                  {serviceIcon(
                    booking.service
                  )}{" "}
                  {serviceLabel(
                    booking.service,
                    i18n.language
                  )}{" "}
                  #
                  {
                    booking.id
                  }
                </p>

                <p className="text-xs text-gray-600">
                  {booking.workerName ||
                    "—"}{" "}
                  ·{" "}
                  {readableDateTime(
                    booking.scheduledAt
                  )}{" "}
                  · ₹
                  {
                    booking.price
                  }

                  {booking.isEmergency && (
                    <span className="ml-2 font-semibold text-rose-600">
                      🚨
                    </span>
                  )}
                </p>

                <PaymentStatus
                  booking={
                    booking
                  }
                />

                {booking.ratingStars ? (
                  <div className="mt-1 flex items-center gap-2">
                    <Stars
                      value={
                        booking.ratingStars
                      }
                    />

                    <span className="text-xs text-gray-500">
                      {t(
                        "booking.rated"
                      )}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <StatusBadge
                  status={
                    booking.status
                  }
                />

                <Link
                  href={`/track/${booking.id}`}
                  className="btn btn-ghost !py-1.5"
                >
                  {booking.status ===
                    "completed" &&
                  !booking.ratingStars
                    ? t(
                        "booking.rate"
                      )
                    : t(
                        "booking.track"
                      )}
                </Link>
              </div>
            </div>
          )
        )}

        {!shown.length && (
          <p className="py-10 text-center text-sm text-gray-500">
            {t(
              "booking.empty"
            )}
          </p>
        )}
      </div>
    </div>
  );
}

function PaymentStatus({
  booking,
}) {
  const paid =
    booking.paymentStatus ===
    "paid";

  return (
    <p
      className={`mt-1 text-xs font-medium ${
        paid
          ? "text-emerald-700"
          : "text-amber-700"
      }`}
    >
      {paid
        ? "✅ Paid"
        : "🕒 Payment pending"}

      {!paid &&
      booking.paymentDueAt
        ? ` · Due ${readableDateTime(
            booking.paymentDueAt
          )}`
        : ""}
    </p>
  );
}

function DashboardCard({
  label,
  value,
}) {
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