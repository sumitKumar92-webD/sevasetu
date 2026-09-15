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

import {
  useTranslation,
} from "react-i18next";

import toast from "react-hot-toast";

import {
  get,
  post,
} from "@/lib/api";

import {
  SERVICES,
  serviceIcon,
  serviceLabel,
} from "@/lib/services";

import useGeo from "@/hooks/useGeo";
import MapView from "@/components/MapView";

import {
  useAuth,
} from "@/components/Providers";

import MobileOtpVerification from "@/components/MobileOtpVerification";

import {
  Loader,
  Stars,
  VerifiedBadge,
} from "@/components/ui";

/**
 * India timezone में datetime-local input value।
 */
function indiaDateTimeInput(
  value
) {
  const date =
    new Date(value);

  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Kolkata",

        year: "numeric",
        month: "2-digit",
        day: "2-digit",

        hour: "2-digit",
        minute: "2-digit",

        hour12: false,
      }
    ).formatToParts(date);

  const values =
    Object.fromEntries(
      parts.map(
        (part) => [
          part.type,
          part.value,
        ]
      )
    );

  let hour =
    values.hour;

  /*
   * कुछ browsers midnight को 24:00 देते हैं।
   */
  if (hour === "24") {
    hour = "00";
  }

  return (
    `${values.year}-` +
    `${values.month}-` +
    `${values.day}T` +
    `${hour}:` +
    `${values.minute}`
  );
}

/**
 * India की आज की date YYYY-MM-DD में।
 */
function indiaTodayKey() {
  return new Date().toLocaleDateString(
    "en-CA",
    {
      timeZone:
        "Asia/Kolkata",

      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  );
}

/**
 * datetime-local value से YYYY-MM-DD।
 */
function selectedDateKey(
  value
) {
  const text =
    String(value || "");

  if (
    /^\d{4}-\d{2}-\d{2}/.test(
      text
    )
  ) {
    return text.slice(0, 10);
  }

  return "";
}

/**
 * Date/time को India format में दिखाना।
 */
function readableDateTime(
  value
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    "hi-IN",
    {
      timeZone:
        "Asia/Kolkata",
    }
  );
}

/**
 * Razorpay checkout script load करना।
 */
function loadRazorpayCheckout() {
  return new Promise(
    (resolve) => {
      if (
        window.Razorpay
      ) {
        resolve(true);
        return;
      }

      const existingScript =
        document.querySelector(
          'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
        );

      if (existingScript) {
        existingScript.addEventListener(
          "load",
          () => resolve(true),
          {
            once: true,
          }
        );

        existingScript.addEventListener(
          "error",
          () => resolve(false),
          {
            once: true,
          }
        );

        return;
      }

      const script =
        document.createElement(
          "script"
        );

      script.src =
        "https://checkout.razorpay.com/v1/checkout.js";

      script.async = true;

      script.onload =
        () => resolve(true);

      script.onerror =
        () => resolve(false);

      document.body.appendChild(
        script
      );
    }
  );
}

function BookingForm() {
  const {
    t,
    i18n,
  } = useTranslation();

  const router =
    useRouter();

  const params =
    useSearchParams();

  const {
    user,
    loading: authLoading,
  } = useAuth();

  const {
    coords,
    locate,
    locating,
  } = useGeo(true);

  const currentLanguage =
    i18n.resolvedLanguage ||
    i18n.language ||
    "en";

  /**
   * Booking form।
   *
   * Customer paymentPlan select नहीं करेगा।
   * paymentPlan selected date से calculate होगा।
   */
  const [
    form,
    setForm,
  ] = useState(() => ({
    service:
      params.get(
        "service"
      ) ||
      "electrician",

    scheduledAt:
      indiaDateTimeInput(
        Date.now() +
          60 *
            60 *
            1000
      ),

    notes: "",
    address: "",

    workerId:
      params.get(
        "worker"
      ) || "",

    isEmergency: false,
  }));

  const [
    candidates,
    setCandidates,
  ] = useState([]);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    phone,
    setPhone,
  ] = useState("");

  const [
    otpVerificationToken,
    setOtpVerificationToken,
  ] = useState("");

  /**
   * Selected booking date।
   */
  const workDateKey =
    selectedDateKey(
      form.scheduledAt
    );

  const todayDateKey =
    indiaTodayKey();

  const bookingIsToday =
    workDateKey ===
    todayDateKey;

  const bookingIsPast =
    Boolean(
      workDateKey &&
      workDateKey <
        todayDateKey
    );

  /**
   * Final payment plan:
   *
   * आज = काम के बाद payment
   * Future = अभी online payment
   */
  const paymentPlan =
    bookingIsToday
      ? "after_work"
      : "pay_now";

  /**
   * Emergency केवल आज।
   */
  const emergencyAvailable =
    bookingIsToday &&
    !bookingIsPast;

  /**
   * Logged-in customer का phone।
   */
  useEffect(() => {
    if (user?.phone) {
      setPhone(
        user.phone
      );
    }
  }, [user]);

  /**
   * Gemini booking draft load करना।
   */
  useEffect(() => {
    if (
      params.get(
        "assistant"
      ) !== "1"
    ) {
      return;
    }

    const savedDraft =
      sessionStorage.getItem(
        "sevasetu_assistant_booking"
      );

    if (!savedDraft) {
      return;
    }

    try {
      const draft =
        JSON.parse(
          savedDraft
        );

      const validService =
        SERVICES.some(
          (service) =>
            service.key ===
            draft.service
        );

      setForm(
        (
          currentForm
        ) => {
          const nextForm = {
            ...currentForm,
          };

          if (validService) {
            nextForm.service =
              draft.service;

            nextForm.workerId =
              "";
          }

          if (
            draft.scheduledAt
          ) {
            nextForm.scheduledAt =
              draft.scheduledAt;
          }

          if (draft.address) {
            nextForm.address =
              draft.address;
          }

          if (draft.notes) {
            nextForm.notes =
              draft.notes;
          }

          if (
            typeof draft.isEmergency ===
            "boolean"
          ) {
            nextForm.isEmergency =
              draft.isEmergency;
          }

          return nextForm;
        }
      );

      sessionStorage.removeItem(
        "sevasetu_assistant_booking"
      );

      toast.success(
        t(
          "voice.detailsFilled",
          {
            defaultValue:
              "Gemini ne booking details fill kar di hain. Details check karke OTP verify karein.",
          }
        )
      );
    } catch (error) {
      console.error(
        "Assistant booking draft error:",
        error
      );

      sessionStorage.removeItem(
        "sevasetu_assistant_booking"
      );
    }
  }, [
    params,
    t,
  ]);

  /**
   * Login check।
   */
  useEffect(() => {
    if (
      !authLoading &&
      !user
    ) {
      router.push(
        "/login"
      );
    }
  }, [
    authLoading,
    user,
    router,
  ]);

  /**
   * Nearby workers load करना।
   */
  const loadCandidates =
    useCallback(
      async () => {
        const query =
          new URLSearchParams({
            service:
              form.service,

            sort: "smart",

            lat: String(
              coords.lat
            ),

            lng: String(
              coords.lng
            ),
          });

        try {
          const data =
            await get(
              `/api/workers?${query.toString()}`
            );

          setCandidates(
            data.workers ||
              []
          );
        } catch (error) {
          console.error(
            "Workers loading error:",
            error
          );

          setCandidates([]);
        }
      },
      [
        form.service,
        coords.lat,
        coords.lng,
      ]
    );

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  /**
   * Work date बदलना।
   *
   * Future date होने पर emergency अपने आप off।
   */
  const updateScheduledAt =
    (scheduledAt) => {
      const dateKey =
        selectedDateKey(
          scheduledAt
        );

      const isToday =
        dateKey ===
        indiaTodayKey();

      setForm(
        (
          currentForm
        ) => ({
          ...currentForm,

          scheduledAt,

          isEmergency:
            isToday
              ? currentForm.isEmergency
              : false,
        })
      );
    };

  /**
   * Booking submit।
   */
  const submit =
    async (
      event,
      emergency = false
    ) => {
      if (event) {
        event.preventDefault();
      }

      if (!user) {
        router.push(
          "/login"
        );

        return;
      }

      if (
        !form.address.trim()
      ) {
        toast.error(
          t(
            "booking.addressRequired",
            {
              defaultValue:
                "Please enter your service address.",
            }
          )
        );

        return;
      }

      if (
        !form.scheduledAt ||
        !workDateKey
      ) {
        toast.error(
          "Booking date aur time select karein."
        );

        return;
      }

      if (bookingIsPast) {
        toast.error(
          "Past date ki booking nahi ho sakti."
        );

        return;
      }

      if (
        !otpVerificationToken
      ) {
        toast.error(
          t(
            "voice.verifyBeforeBooking",
            {
              defaultValue:
                "Booking se pehle mobile OTP verify karein.",
            }
          )
        );

        return;
      }

      const wantsEmergency =
        emergency ||
        form.isEmergency;

      if (
        wantsEmergency &&
        !emergencyAvailable
      ) {
        toast.error(
          "Emergency booking sirf aaj ke liye available hai."
        );

        return;
      }

      setSubmitting(true);

      try {
        const payload = {
          ...form,

          /**
           * Frontend date से plan calculate करता है।
           * Backend भी दोबारा यही validation करेगा।
           */
          paymentPlan,

          isEmergency:
            wantsEmergency,

          workerId:
            form.workerId ||
            null,

          lat: coords.lat,
          lng: coords.lng,

          otpVerificationToken,
        };

        /**
         * आज की booking:
         * Razorpay नहीं खुलेगा।
         * Payment काम पूरा होने के बाद।
         */
        if (
          bookingIsToday
        ) {
          const data =
            await post(
              "/api/bookings",
              payload
            );

          toast.success(
            data.matched
              ? `${t(
                  "booking.created"
                )} ${
                  data.matched
                    .name
                }`
              : t(
                  "booking.created"
                )
          );

          setOtpVerificationToken(
            ""
          );

          router.push(
            `/track/${data.booking.id}`
          );

          return;
        }

        /**
         * Future booking:
         * Razorpay payment जरूरी।
         */
        const razorpayLoaded =
          await loadRazorpayCheckout();

        if (!razorpayLoaded) {
          throw new Error(
            "Razorpay checkout could not load."
          );
        }

        /**
         * Razorpay order backend पर बनाएं।
         */
        const paymentOrder =
          await post(
            "/api/payments/order",
            payload
          );

        const {
          key,
          order,
        } = paymentOrder;

        if (
          !key ||
          !order?.id
        ) {
          throw new Error(
            "Invalid payment order."
          );
        }

        const checkout =
          new window.Razorpay({
            key,

            order_id:
              order.id,

            amount:
              order.amount,

            currency:
              order.currency ||
              "INR",

            name:
              "SevaSetu",

            description:
              `${serviceLabel(
                form.service,
                currentLanguage
              )} booking`,

            prefill: {
              name:
                user.name ||
                "",

              email:
                user.email ||
                "",

              contact:
                phone ||
                user.phone ||
                "",
            },

            notes: {
              service:
                form.service,

              scheduledDate:
                workDateKey,

              address:
                form.address,

              emergency:
                String(
                  wantsEmergency
                ),

              paymentPlan:
                "pay_now",
            },

            theme: {
              color:
                "#0f766e",
            },

            /**
             * Payment success के बाद booking create।
             */
            handler:
              async (
                paymentResponse
              ) => {
                try {
                  const data =
                    await post(
                      "/api/bookings",
                      {
                        ...payload,

                        payment: {
                          razorpay_payment_id:
                            paymentResponse.razorpay_payment_id,

                          razorpay_order_id:
                            paymentResponse.razorpay_order_id,

                          razorpay_signature:
                            paymentResponse.razorpay_signature,
                        },
                      }
                    );

                  toast.success(
                    data.matched
                      ? `${t(
                          "booking.created"
                        )} ${
                          data.matched
                            .name
                        }`
                      : t(
                          "booking.created"
                        )
                  );

                  setOtpVerificationToken(
                    ""
                  );

                  router.push(
                    `/track/${data.booking.id}`
                  );
                } catch (
                  error
                ) {
                  console.error(
                    "Booking creation error:",
                    error
                  );

                  toast.error(
                    error.message ||
                      "Payment completed but booking could not be created."
                  );

                  setSubmitting(
                    false
                  );
                }
              },

            modal: {
              ondismiss:
                () => {
                  setSubmitting(
                    false
                  );

                  toast(
                    "Payment cancelled.",
                    {
                      icon:
                        "ℹ️",
                    }
                  );
                },
            },
          });

        checkout.on(
          "payment.failed",
          (response) => {
            toast.error(
              response.error
                ?.description ||
                "Payment failed."
            );

            setSubmitting(
              false
            );
          }
        );

        checkout.open();
      } catch (error) {
        console.error(
          "Booking/payment error:",
          error
        );

        toast.error(
          error.message ||
            "Could not create booking."
        );

        setSubmitting(false);
      }
    };

  if (
    authLoading ||
    !user
  ) {
    return (
      <Loader
        label={t(
          "app.loading"
        )}
      />
    );
  }

  const best =
    candidates[0];

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <form
        onSubmit={(
          event
        ) =>
          submit(
            event,
            false
          )
        }
        className="card space-y-4 p-6"
      >
        <h1 className="text-2xl font-bold text-gray-900">
          {t(
            "booking.title"
          )}
        </h1>

        {/* Mobile OTP */}
        <MobileOtpVerification
          phone={phone}
          setPhone={
            setPhone
          }
          onVerified={
            setOtpVerificationToken
          }
        />

        {/* Service */}
        <div>
          <label className="label">
            {t(
              "booking.service"
            )}
          </label>

          <select
            className="input"
            value={
              form.service
            }
            onChange={(
              event
            ) =>
              setForm(
                (
                  currentForm
                ) => ({
                  ...currentForm,

                  service:
                    event.target
                      .value,

                  workerId:
                    "",
                })
              )
            }
          >
            {SERVICES.map(
              (service) => (
                <option
                  key={
                    service.key
                  }
                  value={
                    service.key
                  }
                >
                  {
                    service.icon
                  }{" "}
                  {serviceLabel(
                    service.key,
                    currentLanguage
                  )}{" "}
                  · ₹
                  {
                    service.base
                  }
                  /hr
                </option>
              )
            )}
          </select>
        </div>

        {/* Work date and worker */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">
              काम की तारीख और समय
            </label>

            <input
              className="input"
              type="datetime-local"
              required
              min={
                `${todayDateKey}T00:00`
              }
              value={
                form.scheduledAt
              }
              onChange={(
                event
              ) =>
                updateScheduledAt(
                  event.target
                    .value
                )
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
              value={
                form.workerId
              }
              onChange={(
                event
              ) =>
                setForm(
                  (
                    currentForm
                  ) => ({
                    ...currentForm,

                    workerId:
                      event.target
                        .value,
                  })
                )
              }
            >
              <option value="">
                🤖{" "}
                {t(
                  "booking.auto"
                )}
              </option>

              {candidates.map(
                (worker) => (
                  <option
                    key={
                      worker.id
                    }
                    value={
                      worker.id
                    }
                  >
                    {
                      worker.name
                    }{" "}
                    · ⭐
                    {
                      worker.rating
                    }{" "}
                    ·{" "}
                    {
                      worker.distance
                    }{" "}
                    km
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="label">
            {t(
              "booking.address"
            )}
          </label>

          <input
            className="input"
            type="text"
            required
            placeholder="House number, street and landmark"
            value={
              form.address
            }
            onChange={(
              event
            ) =>
              setForm(
                (
                  currentForm
                ) => ({
                  ...currentForm,

                  address:
                    event.target
                      .value,
                })
              )
            }
          />
        </div>

        {/* Notes */}
        <div>
          <label className="label">
            {t(
              "booking.notes"
            )}{" "}
            (
            {t(
              "app.optional"
            )}
            )
          </label>

          <textarea
            className="input"
            rows={3}
            placeholder="अपनी समस्या बताएं"
            value={
              form.notes
            }
            onChange={(
              event
            ) =>
              setForm(
                (
                  currentForm
                ) => ({
                  ...currentForm,

                  notes:
                    event.target
                      .value,
                })
              )
            }
          />
        </div>

        {/* Automatic payment method */}
        <fieldset>
          <legend className="label">
            Payment method
          </legend>

          {bookingIsToday ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  🤝
                </span>

                <div>
                  <p className="font-semibold text-emerald-900">
                    काम पूरा होने के बाद payment
                  </p>

                  <p className="mt-1 text-xs text-emerald-700">
                    आज की booking है। Worker का काम पूरा
                    होने के बाद payment करें।
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  💳
                </span>

                <div>
                  <p className="font-semibold text-blue-900">
                    Booking के साथ online payment
                  </p>

                  <p className="mt-1 text-xs text-blue-700">
                    यह future-date booking है। Booking
                    confirm करने के लिए Razorpay से अभी
                    payment करना होगा।
                  </p>
                </div>
              </div>
            </div>
          )}

          <p className="mt-2 text-xs text-gray-500">
            Selected work date:{" "}
            {readableDateTime(
              form.scheduledAt
            )}
          </p>
        </fieldset>

        {/* Location */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
          <span className="text-sm text-gray-600">
            📍{" "}
            {coords.lat.toFixed(
              4
            )}
            ,{" "}
            {coords.lng.toFixed(
              4
            )}
          </span>

          <button
            type="button"
            className="btn btn-ghost !py-1.5"
            onClick={
              locate
            }
            disabled={
              locating ||
              submitting
            }
          >
            {locating
              ? t(
                  "app.loading"
                )
              : t(
                  "booking.useLocation"
                )}
          </button>
        </div>

        {/* Booking buttons */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            className="btn btn-primary flex-1"
            disabled={
              submitting ||
              !otpVerificationToken ||
              bookingIsPast
            }
          >
            {submitting
              ? bookingIsToday
                ? "Creating booking..."
                : "Opening payment..."
              : bookingIsToday
              ? "✓ Book now — pay after work"
              : "💳 Pay now and book"}
          </button>

          <button
            type="button"
            className="btn btn-danger"
            disabled={
              submitting ||
              !otpVerificationToken ||
              !emergencyAvailable
            }
            title={
              emergencyAvailable
                ? "आज की emergency booking"
                : "Emergency booking केवल आज के लिए है"
            }
            onClick={() =>
              submit(
                null,
                true
              )
            }
          >
            🚨 Emergency
          </button>
        </div>

        {!emergencyAvailable && (
          <p className="text-center text-xs font-medium text-rose-700">
            🚨 Future date पर emergency booking उपलब्ध
            नहीं है।
          </p>
        )}

        {!otpVerificationToken && (
          <p className="text-center text-xs font-medium text-amber-700">
            🔐 Booking से पहले mobile OTP verify करें।
          </p>
        )}

        {bookingIsPast && (
          <p className="text-center text-xs font-medium text-red-700">
            Past date की booking नहीं हो सकती।
          </p>
        )}

        {submitting && (
          <Loader
            label={
              bookingIsToday
                ? "Creating booking..."
                : "Processing payment..."
            }
          />
        )}
      </form>

      {/* Map and worker suggestion */}
      <div className="space-y-4">
        <MapView
          center={[
            coords.lat,
            coords.lng,
          ]}
          height={260}
          markers={[
            {
              lat:
                coords.lat,

              lng:
                coords.lng,

              emoji: "🏠",

              color:
                "#2563eb",

              label:
                t(
                  "track.you"
                ),
            },

            ...candidates
              .slice(0, 10)
              .map(
                (
                  worker
                ) => ({
                  lat:
                    worker.lat,

                  lng:
                    worker.lng,

                  emoji:
                    serviceIcon(
                      worker.service ||
                        form.service
                    ),

                  label:
                    `${worker.name} · ${worker.distance} km`,
                })
              ),
          ]}
        />

        {best && (
          <div className="card space-y-2 border-teal-200 bg-teal-50/40 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
              🤖 Smart match suggestion
            </p>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">
                  {
                    best.name
                  }
                </p>

                <p className="text-xs text-gray-600">
                  {
                    best.distance
                  }{" "}
                  km · ₹
                  {
                    best.pricePerHour
                  }
                  /hr · score{" "}
                  {
                    best.score
                  }
                </p>
              </div>

              <div className="text-right">
                <Stars
                  value={
                    best.rating
                  }
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

        <div className="card space-y-2 p-4 text-xs text-gray-600">
          <p className="font-semibold text-gray-800">
            Payment और emergency rules
          </p>

          <p>
            आज की booking का payment काम पूरा होने के
            बाद होगा।
          </p>

          <p>
            कल या किसी future date की booking के लिए
            Razorpay payment booking के साथ करना होगा।
          </p>

          <p>
            Emergency booking केवल आज की तारीख के लिए
            उपलब्ध है और इसमें 25% emergency charge
            लगेगा।
          </p>
        </div>
      </div>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense
      fallback={
        <Loader />
      }
    >
      <BookingForm />
    </Suspense>
  );
}