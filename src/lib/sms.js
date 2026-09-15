function isTwilioConfigured() {
  return Boolean(
    process.env
      .TWILIO_ACCOUNT_SID &&
      process.env
        .TWILIO_AUTH_TOKEN &&
      process.env
        .TWILIO_PHONE_NUMBER
  );
}

export async function sendOtpSms(
  phone,
  otp
) {
  const message =
    `Your SevaSetu booking OTP is ${otp}. ` +
    "It expires in 5 minutes. " +
    "Do not share it with anyone.";

  /*
   * Development mode:
   * Twilio credentials na hone par
   * OTP terminal mein print होगा.
   */
  if (
    !isTwilioConfigured()
  ) {
    if (
      process.env.NODE_ENV ===
      "production"
    ) {
      throw new Error(
        "SMS service is not configured."
      );
    }

    console.log(
      `[DEV OTP] ${phone}: ${message}`
    );

    return {
      provider:
        "development",
    };
  }

  const accountSid =
    process.env
      .TWILIO_ACCOUNT_SID;

  const authToken =
    process.env
      .TWILIO_AUTH_TOKEN;

  const twilioPhone =
    process.env
      .TWILIO_PHONE_NUMBER;

  const basicAuth =
    Buffer.from(
      `${accountSid}:${authToken}`
    ).toString("base64");

  const requestBody =
    new URLSearchParams({
      To: phone,
      From: twilioPhone,
      Body: message,
    });

  const apiUrl =
    "https://api.twilio.com/" +
    "2010-04-01/Accounts/" +
    accountSid +
    "/Messages.json";

  const response =
    await fetch(apiUrl, {
      method: "POST",

      headers: {
        Authorization:
          `Basic ${basicAuth}`,

        "Content-Type":
          "application/x-www-form-urlencoded",
      },

      body: requestBody,

      cache: "no-store",
    });

  if (!response.ok) {
    const errorText =
      await response.text();

    console.error(
      "Twilio SMS error:",
      errorText
    );

    throw new Error(
      "OTP SMS could not be sent."
    );
  }

  const result =
    await response.json();

  return {
    provider: "twilio",
    messageId: result.sid,
  };
}