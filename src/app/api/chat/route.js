import {
  SERVICES as SERVICE_CATALOG,
} from "@/lib/services";

export const dynamic = "force-dynamic";

const SERVICE_KEYS = SERVICE_CATALOG.map(
  (service) => service.key
);

/**
 * Gemini response से JSON निकालना।
 */
function extractJson(text) {
  if (!text) {
    return null;
  }

  const cleaned = String(text)
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (
      firstBrace === -1 ||
      lastBrace === -1 ||
      lastBrace <= firstBrace
    ) {
      return null;
    }

    try {
      return JSON.parse(
        cleaned.slice(
          firstBrace,
          lastBrace + 1
        )
      );
    } catch {
      return null;
    }
  }
}

/**
 * India की date YYYY-MM-DD में।
 */
function indiaDateKey(value = new Date()) {
  return new Date(value).toLocaleDateString(
    "en-CA",
    {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  );
}

/**
 * datetime-local value से YYYY-MM-DD।
 */
function selectedDateKey(value) {
  const text = String(value || "");

  if (
    /^\d{4}-\d{2}-\d{2}/.test(text)
  ) {
    return text.slice(0, 10);
  }

  return "";
}

/**
 * Retry से पहले wait करना।
 */
function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

/**
 * Gemini 429 या 503 दे तो automatic retry।
 */
async function fetchGeminiWithRetry(
  apiUrl,
  requestOptions,
  maximumAttempts = 3
) {
  let lastResponse = null;

  for (
    let attempt = 1;
    attempt <= maximumAttempts;
    attempt += 1
  ) {
    const response = await fetch(
      apiUrl,
      requestOptions
    );

    lastResponse = response;

    if (
      response.ok ||
      ![429, 503].includes(response.status)
    ) {
      return response;
    }

    if (attempt === maximumAttempts) {
      return response;
    }

    const waitTime = attempt * 1000;

    console.warn(
      `Gemini busy है। ${waitTime}ms बाद retry होगा।`
    );

    await sleep(waitTime);
  }

  return lastResponse;
}

/**
 * Gemini chat API।
 */
export async function POST(request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return Response.json(
        {
          error:
            "GEMINI_API_KEY is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const body = await request.json();

    const messages = Array.isArray(
      body.messages
    )
      ? body.messages.slice(-12)
      : [];

    const language = String(
      body.language || "en"
    ).slice(0, 20);

    if (!messages.length) {
      return Response.json(
        {
          error: "Please enter a message.",
        },
        {
          status: 400,
        }
      );
    }

    const indiaDateTime =
      new Date().toLocaleString(
        "en-IN",
        {
          timeZone: "Asia/Kolkata",
          dateStyle: "full",
          timeStyle: "long",
        }
      );

    const todayDate = indiaDateKey();

    const systemPrompt = `
You are SevaSetu Gemini Assistant for an Indian cooperative household-service platform.

Current India date and time:
${indiaDateTime}

Current India date in YYYY-MM-DD:
${todayDate}

User interface language:
${language}

YOUR RESPONSIBILITIES

1. NORMAL CHAT

Answer questions about:
- SevaSetu services
- workers
- booking
- payments
- emergency booking
- emergency surcharge
- live tracking
- cooperative household services

2. BOOKING COMMAND

Understand booking commands in Hindi, Hinglish, English and other Indian languages.

Examples:
- "Aaj plumber book karo."
- "Aaj electrician chahiye, payment kaam ke baad hoga."
- "Kal subah 9 baje plumber book karo."
- "Friday ko carpenter book karo."
- "Aaj emergency electrician chahiye."
- "Tomorrow at 6 PM book an electrician."

Allowed service keys:

${SERVICE_KEYS.join(", ")}

BOOKING DATE RULES

- Convert relative dates such as today, tomorrow, next Monday and next Friday into YYYY-MM-DDTHH:mm.
- Use the current India date and time shown above.
- scheduledAt is the service or work date and time.
- Never return a past date.
- If the user does not provide a time, choose a reasonable daytime time such as 10:00.
- Do not invent an address.
- If address is missing, keep address empty.

PAYMENT RULES

There are only two payment plans:

1. after_work

Use this only when the selected work date is today in India.

Meaning:
- Customer books the service for today.
- Customer pays after the worker completes the work.
- Online payment is not required while creating today's booking.

2. pay_now

Use this for every future-date booking.

Meaning:
- If the work date is tomorrow, next week or any later date, online payment is required while confirming the booking.
- The application will open Razorpay before creating the future booking.

IMPORTANT PAYMENT RULES

- Payment plan depends only on the selected work date.
- Today's work date must use after_work.
- Tomorrow or any future work date must use pay_now.
- Do not offer payment one day after work.
- Do not offer payment two days after work.
- Do not offer payment three days after work.
- Do not offer a custom payment date.
- Do not return after_1_day.
- Do not return after_2_days.
- Do not return after_3_days.
- If the user asks to pay later for a future booking, explain that future bookings require online payment while booking.

EMERGENCY RULES

- Set isEmergency true only if the user explicitly requests emergency or urgent service.
- Emergency booking is allowed only when the work date is today in India.
- Future emergency bookings are not allowed.
- If the user requests emergency service tomorrow or on another future date:
  - bookingDraft must be null.
  - Explain that emergency booking is available only for today.
  - Offer a normal future booking instead.
- Normal future bookings are allowed, but require online payment while booking.
- Today's emergency booking includes a 25 percent emergency charge.

SECURITY RULES

- Never ask for card number.
- Never ask for CVV.
- Never ask for password.
- Never ask for an API key.
- Never claim that payment succeeded.
- Never claim that booking succeeded.
- The application handles final confirmation and Razorpay.
- Reply concisely in the user's selected language.

Return ONLY valid JSON.

For normal chat:

{
  "reply": "normal assistant response",
  "bookingDraft": null
}

For a valid booking request:

{
  "reply": "short booking summary and ask user to confirm",
  "bookingDraft": {
    "service": "one allowed service key",
    "scheduledAt": "YYYY-MM-DDTHH:mm",
    "address": "user-provided address or empty",
    "notes": "short description of the work",
    "paymentPlan": "after_work or pay_now",
    "isEmergency": false
  }
}
`;

    /**
     * Messages को Gemini format में बदलना।
     */
    const contents = messages
      .filter(
        (message) =>
          message &&
          message.text
      )
      .map((message) => ({
        role:
          message.role === "assistant"
            ? "model"
            : "user",

        parts: [
          {
            text: String(
              message.text
            ).slice(0, 2000),
          },
        ],
      }));

    const model =
      process.env.GEMINI_MODEL ||
      "gemini-2.5-flash";

    const apiUrl =
      "https://generativelanguage.googleapis.com/" +
      "v1beta/models/" +
      encodeURIComponent(model) +
      ":generateContent";

    const requestOptions = {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        "x-goog-api-key":
          process.env.GEMINI_API_KEY,
      },

      body: JSON.stringify({
        system_instruction: {
          parts: [
            {
              text: systemPrompt,
            },
          ],
        },

        contents,

        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 800,

          responseMimeType:
            "application/json",
        },
      }),

      cache: "no-store",
    };

    const geminiResponse =
      await fetchGeminiWithRetry(
        apiUrl,
        requestOptions,
        3
      );

    let geminiData = {};

    try {
      geminiData =
        await geminiResponse.json();
    } catch {
      geminiData = {};
    }

    if (!geminiResponse.ok) {
      console.error(
        "Gemini API error:",
        geminiData
      );

      if (
        [429, 503].includes(
          geminiResponse.status
        )
      ) {
        return Response.json(
          {
            error:
              "Gemini abhi busy hai. Kuch seconds baad dobara try karein.",
          },
          {
            status: 503,
          }
        );
      }

      return Response.json(
        {
          error:
            geminiData?.error?.message ||
            "AI assistant is temporarily unavailable.",
        },
        {
          status: 502,
        }
      );
    }

    const responseText =
      geminiData.candidates?.[0]
        ?.content?.parts
        ?.map(
          (part) =>
            part.text || ""
        )
        .join("")
        .trim();

    const parsedResponse =
      extractJson(responseText);

    if (!parsedResponse) {
      return Response.json({
        reply:
          responseText ||
          "Sorry, I could not understand that request.",

        bookingDraft: null,
      });
    }

    let bookingDraft = null;

    const rawDraft =
      parsedResponse.bookingDraft;

    /**
     * Gemini booking draft validation।
     */
    if (
      rawDraft &&
      SERVICE_KEYS.includes(
        rawDraft.service
      )
    ) {
      const scheduledAt = String(
        rawDraft.scheduledAt || ""
      ).slice(0, 16);

      const workDateKey =
        selectedDateKey(
          scheduledAt
        );

      const isEmergency =
        rawDraft.isEmergency === true;

      if (!workDateKey) {
        return Response.json({
          reply:
            "Booking ki date aur time batayein.",

          bookingDraft: null,
        });
      }

      /**
       * Past booking रोकें।
       */
      if (workDateKey < todayDate) {
        return Response.json({
          reply:
            "Past date ki booking nahi ho sakti. Aaj ya future date select karein.",

          bookingDraft: null,
        });
      }

      const bookingIsToday =
        workDateKey === todayDate;

      /**
       * Future emergency booking रोकें।
       */
      if (
        isEmergency &&
        !bookingIsToday
      ) {
        return Response.json({
          reply:
            "Emergency booking sirf aaj ke liye available hai. Future date ke liye normal booking kar sakte hain, jisme booking ke saath online payment hoga.",

          bookingDraft: null,
        });
      }

      /**
       * Gemini के paymentPlan पर भरोसा नहीं।
       * Date के आधार पर server plan तय करेगा।
       */
      const paymentPlan =
        bookingIsToday
          ? "after_work"
          : "pay_now";

      bookingDraft = {
        service:
          rawDraft.service,

        scheduledAt,

        address: String(
          rawDraft.address || ""
        ).slice(0, 300),

        notes: String(
          rawDraft.notes || ""
        ).slice(0, 1000),

        paymentPlan,

        isEmergency,
      };
    }

    let reply = String(
      parsedResponse.reply ||
        "Request understood."
    ).slice(0, 1500);

    /**
     * Payment rule reply में साफ दिखाएं।
     */
    if (bookingDraft) {
      if (
        bookingDraft.paymentPlan ===
        "after_work"
      ) {
        reply +=
          "\n\nPayment: Aaj kaam complete hone ke baad payment hoga.";
      } else {
        reply +=
          "\n\nPayment: Future booking confirm karne ke liye booking ke saath online payment hoga.";
      }

      if (
        bookingDraft.isEmergency
      ) {
        reply +=
          "\nEmergency: Aaj ki emergency booking par 25% emergency charge lagega.";
      }
    }

    return Response.json({
      reply,
      bookingDraft,
    });
  } catch (error) {
    console.error(
      "Chat request error:",
      error
    );

    return Response.json(
      {
        error:
          error.message ||
          "Chat request failed.",
      },
      {
        status: 500,
      }
    );
  }
}