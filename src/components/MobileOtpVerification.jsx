"use client";

import {
  useState,
} from "react";

import {
  useTranslation,
} from "react-i18next";

import toast from "react-hot-toast";

import {
  post,
} from "@/lib/api";

export default function MobileOtpVerification({
  phone,
  setPhone,
  onVerified,
}) {
  const {
    t,
  } = useTranslation();

  const [
    requestId,
    setRequestId,
  ] = useState("");

  const [
    otp,
    setOtp,
  ] = useState("");

  const [
    verified,
    setVerified,
  ] = useState(false);

  const [
    busy,
    setBusy,
  ] = useState(false);

  const resetVerification =
    () => {
      setRequestId("");
      setOtp("");
      setVerified(false);
      onVerified("");
    };

  const sendOtp =
    async () => {
      if (
        !String(
          phone || ""
        ).trim()
      ) {
        toast.error(
          "Enter mobile number."
        );

        return;
      }

      setBusy(true);

      try {
        const data =
          await post(
            "/api/otp/request",
            {
              phone,
            }
          );

        setRequestId(
          data.requestId
        );

        if (data.devOtp) {
          setOtp(
            data.devOtp
          );
        }

        toast.success(
          `OTP sent to ${data.phoneMasked}`
        );
      } catch (error) {
        toast.error(
          error.message
        );
      } finally {
        setBusy(false);
      }
    };

  const verifyOtp =
    async () => {
      if (
        !requestId ||
        otp.length !== 6
      ) {
        return;
      }

      setBusy(true);

      try {
        const data =
          await post(
            "/api/otp/verify",
            {
              requestId,
              otp,
            }
          );

        setVerified(true);

        onVerified(
          data.verificationToken
        );

        toast.success(
          "Mobile number verified."
        );
      } catch (error) {
        toast.error(
          error.message
        );
      } finally {
        setBusy(false);
      }
    };

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div>
        <p className="font-bold text-gray-900">
          🔐 Mobile OTP Verification
        </p>

        <p className="text-xs text-gray-600">
          Booking aur payment se pehle mobile verify karein.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          className="input"
          type="tel"
          inputMode="tel"
          placeholder="10-digit mobile number"
          value={phone}
          disabled={verified}
          onChange={(
            event
          ) => {
            setPhone(
              event.target
                .value
            );

            resetVerification();
          }}
        />

        <button
          type="button"
          className="btn btn-ghost"
          disabled={
            busy ||
            verified
          }
          onClick={sendOtp}
        >
          {busy
            ? t("app.loading")
            : requestId
              ? "Resend OTP"
              : "Send OTP"}
        </button>
      </div>

      {requestId &&
        !verified && (
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              className="input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="6-digit OTP"
              value={otp}
              onChange={(
                event
              ) =>
                setOtp(
                  event.target.value
                    .replace(
                      /\D/g,
                      ""
                    )
                    .slice(0, 6)
                )
              }
            />

            <button
              type="button"
              className="btn btn-primary"
              disabled={
                busy ||
                otp.length !==
                  6
              }
              onClick={
                verifyOtp
              }
            >
              Verify OTP
            </button>
          </div>
        )}

      {verified && (
        <p className="text-sm font-semibold text-emerald-700">
          ✅ Mobile verified
        </p>
      )}
    </section>
  );
}