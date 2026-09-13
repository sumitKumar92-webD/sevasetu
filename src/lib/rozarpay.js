import crypto from "crypto";

function credentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys are not configured");
  }

  return { keyId, keySecret };
}

async function razorpayRequest(path, options = {}) {
  const { keyId, keySecret } = credentials();

  const baseUrl = "https:" + "//api.razorpay.com/v1";

  const response = await fetch(baseUrl + path, {
    ...options,
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${keyId}:${keySecret}`
      ).toString("base64")}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.description || "Razorpay request failed"
    );
  }

  return data;
}

export function publicRazorpayKey() {
  return credentials().keyId;
}

export function createRazorpayOrder({
  amount,
  receipt,
  notes,
}) {
  return razorpayRequest("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount,
      currency: "INR",
      receipt,
      notes,
    }),
  });
}

export function getRazorpayOrder(orderId) {
  return razorpayRequest(
    `/orders/${encodeURIComponent(orderId)}`
  );
}

export function verifyRazorpaySignature(
  orderId,
  paymentId,
  signature
) {
  const { keySecret } = credentials();

  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(
    expectedSignature,
    "hex"
  );

  const receivedBuffer = Buffer.from(
    String(signature || ""),
    "hex"
  );

  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(
      expectedBuffer,
      receivedBuffer
    )
  );
}