"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  useTranslation,
} from "react-i18next";

import toast from "react-hot-toast";

import {
  get,
  patch,
  post,
} from "@/lib/api";

import {
  distanceKm,
} from "@/lib/geo";

import {
  serviceIcon,
  serviceLabel,
} from "@/lib/services";

import MapView from "@/components/MapView";

import {
  useAuth,
} from "@/components/Providers";

import {
  Avatar,
  Loader,
  Stars,
  StatusBadge,
  StatusTimeline,
  VerifiedBadge,
} from "@/components/ui";

/*
 * Payment plan का readable label।
 */
function paymentLabel(
  booking
) {
  if (
    booking.paymentStatus ===
    "paid"
  ) {
    return "Payment paid online";
  }

  if (
    booking.paymentPlan ===
    "after_1_day"
  ) {
    return "काम के अगले दिन भुगतान";
  }

  if (
    booking.paymentPlan ===
    "after_2_days"
  ) {
    return "काम के 2 दिन बाद भुगतान";
  }

  if (
    booking.paymentPlan ===
    "after_3_days"
  ) {
    return "चुनी हुई तारीख को भुगतान";
  }

  return "काम पूरा होने के बाद भुगतान";
}

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
    return "";
  }

  return date.toLocaleString(
    "hi-IN",
    {
      timeZone:
        "Asia/Kolkata",
    }
  );
}

function loadRazorpayCheckout() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function TrackPage() {
  const {
    t,
    i18n,
  } = useTranslation();

  const {
    id,
  } = useParams();

  const router =
    useRouter();

  const {
    user,
    worker,
    loading: authLoading,
  } = useAuth();

  const [
    booking,
    setBooking,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    sharing,
    setSharing,
  ] = useState(false);

  const [
    stars,
    setStars,
  ] = useState(5);

  const [
    comment,
    setComment,
  ] = useState("");

  const [
    paying,
    setPaying,
  ] = useState(false);

  const [
    confirmingCash,
    setConfirmingCash,
  ] = useState(false);

  const watchRef =
    useRef(null);

  const isWorker =
    user?.role ===
      "worker" &&
    worker &&
    booking?.workerId ===
      worker.id;

  const isCustomer =
    user?.role ===
      "customer" &&
    booking?.customerId ===
      user.id;

  /*
   * Booking load करना।
   */
  const load =
    useCallback(
      async () => {
        try {
          const data =
            await get(
              `/api/bookings/${id}`
            );

          setBooking(
            data.booking
          );
        } catch (error) {
          toast.error(
            error.message
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [id]
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
  }, [
    authLoading,
    user,
    router,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  /*
   * Booking और live location polling।
   */
  useEffect(() => {
    const timer =
      setInterval(
        async () => {
          try {
            if (
              booking &&
              booking.status ===
                "on_the_way" &&
              !sharing
            ) {
              const data =
                await patch(
                  `/api/bookings/${id}`,
                  {
                    action:
                      "simulate",
                  }
                );

              setBooking(
                data.booking
              );
            } else {
              const data =
                await get(
                  `/api/bookings/${id}`
                );

              setBooking(
                data.booking
              );
            }
          } catch {
            /*
             * Temporary polling errors ignore करें।
             */
          }
        },
        3000
      );

    return () =>
      clearInterval(timer);
  }, [
    id,
    booking,
    sharing,
  ]);

  /*
   * Worker live location sharing।
   */
  const toggleShare =
    () => {
      if (sharing) {
        if (
          watchRef.current
        ) {
          navigator.geolocation.clearWatch(
            watchRef.current
          );
        }

        watchRef.current =
          null;

        setSharing(false);

        return;
      }

      if (
        !navigator.geolocation
      ) {
        toast.error(
          "Geolocation not supported"
        );

        return;
      }

      watchRef.current =
        navigator.geolocation.watchPosition(
          async (
            position
          ) => {
            try {
              const data =
                await patch(
                  `/api/bookings/${id}`,
                  {
                    action:
                      "location",

                    lat:
                      position
                        .coords
                        .latitude,

                    lng:
                      position
                        .coords
                        .longitude,
                  }
                );

              setBooking(
                data.booking
              );
            } catch {
              /*
               * Temporary location error ignore करें।
               */
            }
          },

          () =>
            toast.error(
              "Could not read your location"
            ),

          {
            enableHighAccuracy:
              true,
          }
        );

      setSharing(true);

      toast.success(
        "Live location sharing on"
      );
    };

  useEffect(() => {
    return () => {
      if (
        watchRef.current &&
        navigator.geolocation
      ) {
        navigator.geolocation.clearWatch(
          watchRef.current
        );
      }
    };
  }, []);

  /*
   * Booking status change।
   */
  const setStatus =
    async (status) => {
      try {
        const data =
          await patch(
            `/api/bookings/${id}`,
            {
              status,
            }
          );

        setBooking(
          data.booking
        );

        toast.success(
          t(
            `status.${status}`
          )
        );
      } catch (error) {
        toast.error(
          error.message
        );
      }
    };

  /*
   * दूसरा worker assign करना।
   */
  const reassign =
    async () => {
      try {
        const data =
          await patch(
            `/api/bookings/${id}`,
            {
              action:
                "reassign",
            }
          );

        setBooking(
          data.booking
        );

        toast.success(
          "New worker assigned"
        );
      } catch (error) {
        toast.error(
          error.message
        );
      }
    };

  /*
   * Rating submit करना।
   */
  const submitRating =
    async () => {
      try {
        const data =
          await post(
            `/api/bookings/${id}/rate`,
            {
              stars,
              comment,
            }
          );

        setBooking(
          data.booking
        );

        toast.success(
          t(
            "rating.thanks"
          )
        );
      } catch (error) {
        toast.error(
          error.message
        );
      }
    };


  const payAfterWork = async () => {
    if (!booking || booking.status !== "completed") {
      toast.error("Work complete hone ke baad payment available hoga.");
      return;
    }
    if (booking.paymentStatus === "paid") {
      toast.success("Payment already completed.");
      return;
    }

    setPaying(true);
    try {
      const loaded = await loadRazorpayCheckout();
      if (!loaded) throw new Error("Razorpay checkout could not load.");

      const paymentOrder = await post(`/api/bookings/${id}/payment/order`, {});
      const { key, order } = paymentOrder;
      if (!key || !order?.id) throw new Error("Invalid payment order.");

      const checkout = new window.Razorpay({
        key,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "SevaSetu",
        description: `${serviceLabel(booking.service, i18n.language)} - completed work payment`,
        prefill: {
          name: user?.name || booking.customerName || "",
          email: user?.email || "",
          contact: user?.phone || booking.customerPhone || "",
        },
        theme: { color: "#0f766e" },
        handler: async (response) => {
          try {
            const data = await post(`/api/bookings/${id}/payment/verify`, {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
            setBooking(data.booking);
            toast.success("Online payment successful. Ab rating de sakte hain.");
          } catch (error) {
            toast.error(error.message || "Payment verification failed.");
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
            toast("Payment cancelled.");
          },
        },
      });

      checkout.on("payment.failed", (response) => {
        setPaying(false);
        toast.error(response?.error?.description || "Payment failed.");
      });
      checkout.open();
    } catch (error) {
      setPaying(false);
      toast.error(error.message || "Could not start payment.");
    }
  };

  const confirmCashPayment = async () => {
    if (!booking || booking.status !== "completed") {
      toast.error("Work complete hone ke baad cash payment available hoga.");
      return;
    }
    if (booking.paymentStatus === "paid") {
      toast.success("Payment already completed.");
      return;
    }
    if (!window.confirm(`Kya aapne worker ko ₹${booking.price} cash de diya hai?`)) return;

    setConfirmingCash(true);
    try {
      const data = await post(`/api/bookings/${id}/payment/cash`, {});
      setBooking(data.booking);
      toast.success("Cash payment confirmed. Ab rating de sakte hain.");
    } catch (error) {
      toast.error(error.message || "Cash payment could not be confirmed.");
    } finally {
      setConfirmingCash(false);
    }
  };

  if (
    loading ||
    authLoading
  ) {
    return <Loader />;
  }

  if (!booking) {
    return (
      <p className="py-10 text-center text-gray-500">
        Booking not
        found.
      </p>
    );
  }

  const hasWorkerPosition =
    booking.workerLat !=
      null &&
    booking.workerLng !=
      null;

  const distance =
    hasWorkerPosition
      ? distanceKm(
          booking.workerLat,
          booking.workerLng,
          booking.customerLat,
          booking.customerLng
        )
      : null;

  const eta =
    distance != null
      ? Math.max(
          1,
          Math.round(
            (distance / 22) *
              60
          )
        )
      : null;

  const markers = [
    {
      lat:
        booking.customerLat,

      lng:
        booking.customerLng,

      emoji: "🏠",

      color:
        "#2563eb",

      label:
        t(
          "track.you"
        ),
    },
  ];

  if (
    hasWorkerPosition
  ) {
    markers.push({
      lat:
        booking.workerLat,

      lng:
        booking.workerLng,

      emoji:
        serviceIcon(
          booking.service
        ),

      color:
        "#dc2626",

      label:
        `${booking.workerName} · ${distance} km`,
    });
  }

  const line =
    hasWorkerPosition
      ? [
          [
            booking.workerLat,
            booking.workerLng,
          ],

          [
            booking.customerLat,
            booking.customerLng,
          ],
        ]
      : null;

  const workerRating =
    booking.workerRatingCount
      ? Math.round(
          (
            booking.workerRatingSum /
            booking.workerRatingCount
          ) * 10
        ) / 10
      : 4.2;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t(
              "track.title"
            )}{" "}
            #
            {
              booking.id
            }
          </h1>

          <p className="text-sm text-gray-600">
            {serviceIcon(
              booking.service
            )}{" "}
            {serviceLabel(
              booking.service,
              i18n.language
            )}

            {booking.isEmergency && (
              <span className="ml-2 font-semibold text-rose-600">
                🚨 Emergency
              </span>
            )}
          </p>
        </div>

        <StatusBadge
          status={
            booking.status
          }
        />
      </div>

      <StatusTimeline
        status={
          booking.status
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Map */}
        <MapView
          center={
            hasWorkerPosition
              ? [
                  (
                    booking.workerLat +
                    booking.customerLat
                  ) / 2,

                  (
                    booking.workerLng +
                    booking.customerLng
                  ) / 2,
                ]
              : [
                  booking.customerLat,
                  booking.customerLng,
                ]
          }
          height={430}
          markers={
            markers
          }
          line={line}
        />

        <div className="space-y-4">
          {/* Booking details */}
          <div className="card space-y-3 p-4">
            {booking.workerId ? (
              <>
                <div className="flex items-center gap-3">
                  <Avatar
                    src={
                      booking.workerPhoto
                    }
                    name={
                      booking.workerName
                    }
                  />

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-900">
                        {
                          booking.workerName
                        }
                      </p>

                      <VerifiedBadge
                        status={
                          booking.workerVerification
                        }
                      />
                    </div>

                    <p className="text-xs text-gray-500">
                      ⭐{" "}
                      {
                        workerRating
                      }{" "}
                      · 📞{" "}
                      {booking.workerPhone ||
                        "—"}
                    </p>
                  </div>
                </div>

                {eta != null &&
                  booking.status !==
                    "completed" && (
                    <div className="rounded-xl bg-teal-50 p-3 text-sm text-teal-800">
                      <span className="font-bold">
                        {t(
                          "track.eta"
                        )}
                        :{" "}
                        {
                          eta
                        }{" "}
                        {t(
                          "track.mins"
                        )}
                      </span>

                      <span className="ml-2 text-teal-600">
                        (
                        {
                          distance
                        }{" "}
                        km)
                      </span>
                    </div>
                  )}
              </>
            ) : (
              <p className="text-sm text-gray-600">
                ⏳ उपलब्ध
                worker खोज रहे
                हैं…
              </p>
            )}

            <div className="space-y-2 border-t border-gray-100 pt-3 text-sm text-gray-600">
              <p>
                🗓{" "}
                {readableDateTime(
                  booking.scheduledAt
                )}
              </p>

              <p>
                📍{" "}
                {booking.address ||
                  "Location pinned on map"}
              </p>

              {booking.notes && (
                <p>
                  📝{" "}
                  {
                    booking.notes
                  }
                </p>
              )}

              <p className="font-semibold text-gray-900">
                💰 ₹
                {
                  booking.price
                }
              </p>

              <div
                className={`rounded-xl p-3 ${
                  booking.paymentStatus ===
                  "paid"
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-amber-50 text-amber-800"
                }`}
              >
                <p className="font-semibold">
                  {booking.paymentStatus ===
                  "paid"
                    ? "✅ Payment paid"
                    : `🕒 ${paymentLabel(
                        booking
                      )}`}
                </p>

                {booking.paymentStatus !==
                  "paid" &&
                  booking.paymentDueAt && (
                    <p className="mt-1 text-xs">
                      Payment due:{" "}
                      {readableDateTime(
                        booking.paymentDueAt
                      )}
                    </p>
                  )}
              </div>
            </div>
          </div>

          {/* Worker controls */}
          {isWorker &&
            booking.status !==
              "completed" &&
            booking.status !==
              "cancelled" && (
              <div className="card space-y-2 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Worker controls
                </p>

                {booking.status ===
                  "assigned" && (
                  <button
                    className="btn btn-primary w-full"
                    onClick={() =>
                      setStatus(
                        "on_the_way"
                      )
                    }
                  >
                    🚗{" "}
                    {t(
                      "worker.start"
                    )}
                  </button>
                )}

                {booking.status ===
                  "on_the_way" && (
                  <button
                    className="btn btn-primary w-full"
                    onClick={() =>
                      setStatus(
                        "completed"
                      )
                    }
                  >
                    ✅{" "}
                    {t(
                      "worker.complete"
                    )}
                  </button>
                )}

                <button
                  className="btn btn-ghost w-full"
                  onClick={
                    toggleShare
                  }
                >
                  {sharing
                    ? `⏹ ${t(
                        "worker.stopSharing"
                      )}`
                    : `📡 ${t(
                        "worker.shareLocation"
                      )}`}
                </button>
              </div>
            )}

          {/* Customer controls */}
          {isCustomer &&
            booking.status !==
              "completed" &&
            booking.status !==
              "cancelled" && (
              <div className="card space-y-2 p-4">
                <button
                  className="btn btn-ghost w-full"
                  onClick={
                    reassign
                  }
                >
                  🔁 Assign
                  another worker
                </button>

                <button
                  className="btn btn-danger w-full"
                  onClick={() =>
                    setStatus(
                      "cancelled"
                    )
                  }
                >
                  ✕{" "}
                  {t(
                    "booking.cancel"
                  )}
                </button>
              </div>
            )}

          {/* Payment options after work completion */}
          {isCustomer &&
            booking.status === "completed" &&
            booking.paymentStatus !== "paid" && (
              <div className="card space-y-4 border-amber-200 bg-amber-50/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-gray-900">✅ Work completed</p>
                    <p className="mt-1 text-sm text-gray-600">
                      Worker ne kaam complete kar diya hai. Payment method select karein.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Amount payable</p>
                    <p className="text-2xl font-extrabold text-gray-900">₹{booking.price}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={confirmCashPayment}
                    disabled={confirmingCash || paying}
                    className="rounded-2xl border-2 border-emerald-200 bg-white p-4 text-left transition hover:border-emerald-500 hover:bg-emerald-50 disabled:opacity-60"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">💵</span>
                      <div>
                        <p className="font-bold text-gray-900">Cash Payment</p>
                        <p className="text-xs text-gray-500">Cash dene ke baad confirm karein</p>
                      </div>
                    </div>
                    <div className="mt-3 rounded-xl bg-emerald-600 px-3 py-2 text-center text-sm font-semibold text-white">
                      {confirmingCash ? "Confirming…" : `Confirm Cash ₹${booking.price}`}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={payAfterWork}
                    disabled={paying || confirmingCash}
                    className="rounded-2xl border-2 border-teal-200 bg-white p-4 text-left transition hover:border-teal-500 hover:bg-teal-50 disabled:opacity-60"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">💳</span>
                      <div>
                        <p className="font-bold text-gray-900">Online Payment</p>
                        <p className="text-xs text-gray-500">UPI, card, net banking or wallet</p>
                      </div>
                    </div>
                    <div className="mt-3 rounded-xl bg-teal-700 px-3 py-2 text-center text-sm font-semibold text-white">
                      {paying ? "Opening Razorpay…" : `Pay Online ₹${booking.price}`}
                    </div>
                  </button>
                </div>
              </div>
            )}

          {/* Rating */}
          {isCustomer &&
            booking.status ===
              "completed" &&
            booking.paymentStatus ===
              "paid" && (
              <div className="card space-y-3 p-4">
                <p className="font-semibold text-gray-900">
                  {t(
                    "rating.title"
                  )}
                </p>

                {booking.ratingStars ? (
                  <div className="space-y-1">
                    <Stars
                      value={
                        booking.ratingStars
                      }
                      size="text-lg"
                    />

                    <p className="text-sm text-gray-600">
                      {
                        booking.ratingComment
                      }
                    </p>

                    <p className="text-xs font-semibold text-emerald-600">
                      {t(
                        "rating.thanks"
                      )}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-1 text-2xl">
                      {[
                        1,
                        2,
                        3,
                        4,
                        5,
                      ].map(
                        (
                          number
                        ) => (
                          <button
                            key={
                              number
                            }
                            type="button"
                            onClick={() =>
                              setStars(
                                number
                              )
                            }
                            className={
                              number <=
                              stars
                                ? "text-amber-500"
                                : "text-gray-300"
                            }
                            aria-label={`${number} stars`}
                          >
                            ★
                          </button>
                        )
                      )}
                    </div>

                    <textarea
                      className="input"
                      rows={2}
                      placeholder={t(
                        "rating.comment"
                      )}
                      value={
                        comment
                      }
                      onChange={(
                        event
                      ) =>
                        setComment(
                          event
                            .target
                            .value
                        )
                      }
                    />

                    <button
                      type="button"
                      className="btn btn-primary w-full"
                      onClick={
                        submitRating
                      }
                    >
                      {t(
                        "rating.submit"
                      )}
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