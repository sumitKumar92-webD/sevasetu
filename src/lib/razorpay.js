import crypto from "crypto";

function getCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret =
    process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required"
    );
  }

  return {
    keyId,
    keySecret,
  };
}

async function razorpayRequest(
  path,
  options = {}
) {
  const { keyId, keySecret } =
    getCredentials();

  const authorization = Buffer.from(
    `${keyId}:${keySecret}`
  ).toString("base64");

  const baseUrl =
    "https:" +
    "//api.razorpay.com/v1";

  const response = await fetch(
    baseUrl + path,
    {
      ...options,

      headers: {
        Authorization:
          `Basic ${authorization}`,

        "Content-Type":
          "application/json",

        ...(options.headers || {}),
      },

      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.description ||
        "Razorpay request failed"
    );
  }

  return data;
}

export function publicRazorpayKey() {
  const { keyId } = getCredentials();
  return keyId;
}

export async function createRazorpayOrder({
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

export async function getRazorpayOrder(
  orderId
) {
  return razorpayRequest(
    `/orders/${encodeURIComponent(
      orderId
    )}`
  );
}

export function verifyRazorpaySignature(
  orderId,
  paymentId,
  signature
) {
  const { keySecret } =
    getCredentials();

  const generatedSignature = crypto
    .createHmac(
      "sha256",
      keySecret
    )
    .update(
      `${orderId}|${paymentId}`
    )
    .digest("hex");

  const generatedBuffer =
    Buffer.from(
      generatedSignature,
      "hex"
    );

  const receivedBuffer =
    Buffer.from(
      String(signature || ""),
      "hex"
    );

  if (
    generatedBuffer.length !==
    receivedBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    generatedBuffer,
    receivedBuffer
  );
}