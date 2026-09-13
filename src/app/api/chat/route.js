export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `
You are SevaSetu Assistant, a concise
service-booking helper for India.

Help users choose plumbers, electricians,
cleaners, carpenters, AC repair workers
and other listed services.

Explain booking, emergency surcharge,
payment and live tracking.

Reply in the user's Hindi, English or
Hinglish.

Never claim a booking or payment succeeded
unless the app confirms it.

Never request passwords, OTPs, card numbers
or API keys.

For medical, fire, police or life-threatening
emergencies, tell the user to contact the
appropriate emergency service.
`;

export async function POST(request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return Response.json(
        {
          error:
            "Gemini API key is not configured.",
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

    const contents = messages
      .filter(
        (message) =>
          message && message.text
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

    if (!contents.length) {
      return Response.json(
        {
          error:
            "Please enter a message.",
        },
        {
          status: 400,
        }
      );
    }

    const model =
      process.env.GEMINI_MODEL ||
      "gemini-2.5-flash";

    const baseUrl =
      "https:" +
      "//generativelanguage.googleapis.com/v1beta/models/";

    const response = await fetch(
      baseUrl +
        encodeURIComponent(model) +
        ":generateContent",
      {
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
                text: SYSTEM_PROMPT,
              },
            ],
          },

          contents,

          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 500,
          },
        }),

        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Gemini API error:",
        data
      );

      return Response.json(
        {
          error:
            "AI assistant is temporarily unavailable.",
        },
        {
          status: 502,
        }
      );
    }

    const reply =
      data.candidates?.[0]?.content?.parts
        ?.map(
          (part) => part.text || ""
        )
        .join("")
        .trim();

    return Response.json({
      reply:
        reply ||
        "Sorry, I could not generate an answer.",
    });
  } catch (error) {
    console.error(
      "Chat request error:",
      error
    );

    return Response.json(
      {
        error: "Chat request failed.",
      },
      {
        status: 500,
      }
    );
  }
}