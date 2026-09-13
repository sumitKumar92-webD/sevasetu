"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

import { get, post } from "@/lib/api";
import {
  SERVICES,
  serviceLabel,
  serviceIcon,
} from "@/lib/services";
import useGeo from "@/hooks/useGeo";
import MapView from "@/components/MapView";
import { useAuth } from "@/components/Providers";
import {
  Loader,
  Stars,
  VerifiedBadge,
} from "@/components/ui";

function loadRazorpayCheckout() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");

    script.src =
      "https:" +
      "//checkout.razorpay.com/v1/checkout.js";

    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
}

function BookingForm() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useSearchParams();

  const {
    user,
    loading: authLoading,
  } = useAuth();

  const {
    coords,
    locate,
    locating,
  } = useGeo(true);

  const [form, setForm] = useState({
    service:
      params.get("service") ||
      "electrician",

    scheduledAt: new Date(
      Date.now() + 60 * 60 * 1000
    )
      .toISOString()
      .slice(0, 16),

    notes: "",
    address: "",

    workerId:
      params.get("worker") || "",

    isEmergency: false,
  });

  const [
    candidates,
    setCandidates,
  ] = useState([]);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  const loadCandidates =
    useCallback(async () => {
      const qs = new URLSearchParams({
        service: form.service,
        sort: "smart",
        lat: String(coords.lat),
        lng: String(coords.lng),
      });

      try {
        const data = await get(
          `/api/workers?${qs.toString()}`
        );

        setCandidates(
          data.workers || []
        );
      } catch {
        setCandidates([]);
      }
    }, [
      form.service,
      coords.lat,
      coords.lng,
    ]);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const submit = async (
    event,
    emergency = false
  ) => {
    if (event) {
      event.preventDefault();
    }

    if (!user) {
      router.push("/login");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        ...form,

        isEmergency:
          emergency ||
          form.isEmergency,

        workerId:
          form.workerId || null,

        lat: coords.lat,
        lng: coords.lng,
      };

      /*
       * Load Razorpay checkout script
       */

      const loaded =
        await loadRazorpayCheckout();

      if (!loaded) {
        throw new Error(
          "Razorpay checkout could not load."
        );
      }

      /*
       * Create Razorpay order from server
       */

      const { key, order } =
        await post(
          "/api/payments/order",
          payload
        );

      /*
       * Razorpay checkout settings
       */

      const checkout =
        new window.Razorpay({
          key,

          order_id: order.id,

          amount: order.amount,

          currency: order.currency,

          name: "SevaSetu",

          description:
            `${serviceLabel(
              form.service,
              i18n.language
            )} booking`,

          prefill: {
            name: user?.name || "",
            email: user?.email || "",
            contact:
              user?.phone || "",
          },

          theme: {
            color: "#0f766e",
          },

          /*
           * Payment success callback
           */

          handler: async (
            paymentResponse
          ) => {
            try {
              const data = await post(
                "/api/bookings",
                {
                  ...payload,

                  payment:
                    paymentResponse,
                }
              );

              if (data.matched) {
                toast.success(
                  `${t(
                    "booking.created"
                  )} ${
                    data.matched.name
                  }`
                );
              } else {
                toast(
                  "Payment successful — searching for a worker.",
                  {
                    icon: "⏳",
                  }
                );
              }

              router.push(
                `/track/${data.booking.id}`
              );
            } catch (error) {
              toast.error(
                error.message ||
                  "Payment completed but booking could not be created."
              );

              setSubmitting(false);
            }
          },

          modal: {
            ondismiss: () => {
              setSubmitting(false);
            },
          },
        });

      /*
       * Payment failure callback
       */

      checkout.on(
        "payment.failed",
        (response) => {
          toast.error(
            response.error
              ?.description ||
              "Payment failed."
          );

          setSubmitting(false);
        }
      );

      checkout.open();
    } catch (error) {
      toast.error(
        error.message ||
          "Could not start payment."
      );

      setSubmitting(false);
    }
  };

  if (authLoading) {
    return <Loader />;
  }

  const best = candidates[0];

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <form
        onSubmit={(event) =>
          submit(event, false)
        }
        className="card space-y-4 p-6"
      >
        <h1 className="text-2xl font-bold text-gray-900">
          {t("booking.title")}
        </h1>

        {/* Service selection */}

        <div>
          <label className="label">
            {t("booking.service")}
          </label>

          <select
            className="input"
            value={form.service}
            onChange={(event) =>
              setForm({
                ...form,

                service:
                  event.target.value,

                workerId: "",
              })
            }
          >
            {SERVICES.map(
              (service) => (
                <option
                  key={service.key}
                  value={service.key}
                >
                  {service.icon}{" "}
                  {serviceLabel(
                    service.key,
                    i18n.language
                  )}{" "}
                  · ₹{service.base}/hr
                </option>
              )
            )}
          </select>
        </div>

        {/* Date and worker */}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">
              {t(
                "booking.datetime"
              )}
            </label>

            <input
              className="input"
              type="datetime-local"
              value={
                form.scheduledAt
              }
              onChange={(event) =>
                setForm({
                  ...form,

                  scheduledAt:
                    event.target
                      .value,
                })
              }
            />
          </div>

          <div>
            <label className="label">
              {t(
                "booking.chooseWorker"
              )}
            </label>

            <select
              className="input"
              value={form.workerId}
              onChange={(event) =>
                setForm({
                  ...form,

                  workerId:
                    event.target.value,
                })
              }
            >
              <option value="">
                🤖{" "}
                {t("booking.auto")}
              </option>

              {candidates.map(
                (worker) => (
                  <option
                    key={worker.id}
                    value={worker.id}
                  >
                    {worker.name} · ⭐
                    {worker.rating} ·{" "}
                    {worker.distance} km
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        {/* Address */}

        <div>
          <label className="label">
            {t("booking.address")}
          </label>

          <input
            className="input"
            placeholder="House no, street, landmark"
            value={form.address}
            onChange={(event) =>
              setForm({
                ...form,

                address:
                  event.target.value,
              })
            }
          />
        </div>

        {/* Notes */}

        <div>
          <label className="label">
            {t("booking.notes")} (
            {t("app.optional")})
          </label>

          <textarea
            className="input"
            rows={3}
            value={form.notes}
            onChange={(event) =>
              setForm({
                ...form,

                notes:
                  event.target.value,
              })
            }
          />
        </div>

        {/* Location */}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
          <span className="text-sm text-gray-600">
            📍{" "}
            {coords.lat.toFixed(4)},{" "}
            {coords.lng.toFixed(4)}
          </span>

          <button
            type="button"
            className="btn btn-ghost !py-1.5"
            onClick={locate}
            disabled={locating}
          >
            {locating
              ? t("app.loading")
              : t(
                  "booking.useLocation"
                )}
          </button>
        </div>

        {/* Payment buttons */}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            className="btn btn-primary flex-1"
            disabled={submitting}
          >
            {submitting
              ? "Opening payment…"
              : `💳 Pay & ${t(
                  "booking.submit"
                )}`}
          </button>

          <button
            type="button"
            className="btn btn-danger"
            disabled={submitting}
            onClick={() =>
              submit(null, true)
            }
          >
            🚨{" "}
            {t(
              "booking.emergency"
            )}
          </button>
        </div>

        {submitting && (
          <Loader label="Processing payment…" />
        )}
      </form>

      {/* Map and worker suggestions */}

      <div className="space-y-4">
        <MapView
          center={[
            coords.lat,
            coords.lng,
          ]}
          height={260}
          markers={[
            {
              lat: coords.lat,
              lng: coords.lng,
              emoji: "🏠",
              color: "#2563eb",
              label: t("track.you"),
            },

            ...candidates
              .slice(0, 10)
              .map((worker) => ({
                lat: worker.lat,
                lng: worker.lng,

                emoji: serviceIcon(
                  worker.service
                ),

                label:
                  `${worker.name} · ${worker.distance} km`,
              })),
          ]}
        />

        {best && (
          <div className="card space-y-2 border-teal-200 bg-teal-50/40 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
              🤖 Smart match
              suggestion
            </p>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">
                  {best.name}
                </p>

                <p className="text-xs text-gray-600">
                  {best.distance} km · ₹
                  {best.pricePerHour}
                  /hr · score{" "}
                  {best.score}
                </p>
              </div>

              <div className="text-right">
                <Stars
                  value={best.rating}
                />

                <div className="mt-1">
                  <VerifiedBadge
                    status={
                      best.verification
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="card p-4 text-xs text-gray-600">
          <p className="mb-1 font-semibold text-gray-800">
            How assignment works
          </p>

          <p>
            Score = distance (50) +
            rating (35) +
            availability (10) +
            experience (5).
            Emergency bookings
            prioritise the nearest
            online professional and
            add a 25% surge.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense
      fallback={<Loader />}
    >
      <BookingForm />
    </Suspense>
  );
}