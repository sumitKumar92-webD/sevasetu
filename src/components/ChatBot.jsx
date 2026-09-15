"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  useTranslation,
} from "react-i18next";

import {
  post,
} from "@/lib/api";

import {
  useAuth,
} from "@/components/Providers";

import {
  speechCodeFor,
} from "@/i18n/languages";

/**
 * Gemini booking draft को confirm करने वाले words।
 */
const CONFIRM_WORDS = [
  "confirm",
  "yes",
  "haan",
  "han",
  "ha",
  "ok",
  "okay",
  "continue",
  "book kar do",
  "kar do",
  "कर दो",
  "बुक कर दो",
  "हां",
  "हाँ",
  "ठीक है",
  "ঠিক আছে",
  "হ্যাঁ",
  "હા",
  "ಹೌದು",
  "അതെ",
  "ஆம்",
  "అవును",
  "جی",
];

/**
 * User का message confirmation है या नहीं।
 */
function isConfirmation(
  message
) {
  const normalized =
    String(message || "")
      .trim()
      .toLowerCase();

  return CONFIRM_WORDS.some(
    (word) => {
      const normalizedWord =
        word.toLowerCase();

      return (
        normalized ===
          normalizedWord ||
        normalized.includes(
          normalizedWord
        )
      );
    }
  );
}

/**
 * Booking date readable format में।
 */
function readableBookingDate(
  value
) {
  if (!value) {
    return "Not provided";
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
 * केवल दो payment plans:
 *
 * after_work = आज काम पूरा होने के बाद
 * pay_now = future booking के साथ online payment
 */
function paymentPlanLabel(
  bookingDraft
) {
  if (
    bookingDraft
      ?.paymentPlan ===
    "pay_now"
  ) {
    return "Booking के साथ online payment";
  }

  return "काम पूरा होने के बाद payment";
}

export default function ChatBot() {
  const router =
    useRouter();

  const {
    i18n,
  } = useTranslation();

  const {
    user,
  } = useAuth();

  const recognitionRef =
    useRef(null);

  const messagesEndRef =
    useRef(null);

  const [
    open,
    setOpen,
  ] = useState(false);

  const [
    input,
    setInput,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    listening,
    setListening,
  ] = useState(false);

  const [
    pendingDraft,
    setPendingDraft,
  ] = useState(null);

  const [
    messages,
    setMessages,
  ] = useState([
    {
      role:
        "assistant",

      text:
        "Namaste! Main SevaSetu Gemini Assistant hoon. " +
        "Aap service ke baare mein pooch sakte hain ya booking command bol sakte hain. " +
        "Jaise: “Aaj plumber book karo” ya “Kal electrician book karo.”",
    },
  ]);

  /**
   * नया message आने पर chat को नीचे scroll करें।
   */
  useEffect(() => {
    messagesEndRef.current
      ?.scrollIntoView({
        behavior: "smooth",
      });
  }, [
    messages,
    loading,
    pendingDraft,
  ]);

  /**
   * Component unmount होने पर microphone बंद करें।
   */
  useEffect(() => {
    return () => {
      recognitionRef.current
        ?.stop();
    };
  }, []);

  /**
   * Assistant message add करना।
   */
  const addAssistantMessage =
    (text) => {
      setMessages(
        (
          currentMessages
        ) => [
          ...currentMessages,

          {
            role:
              "assistant",

            text,
          },
        ]
      );
    };

  /**
   * Gemini booking draft को booking page में भेजना।
   */
  const openBookingPage =
    (bookingDraft) => {
      if (!user) {
        addAssistantMessage(
          "Booking ke liye pehle login karein. Login ke baad command dobara boliye."
        );

        router.push(
          "/login"
        );

        return;
      }

      /**
       * Draft में ये details save होंगी:
       *
       * service
       * scheduledAt
       * address
       * notes
       * paymentPlan
       * isEmergency
       */
      sessionStorage.setItem(
        "sevasetu_assistant_booking",

        JSON.stringify(
          bookingDraft
        )
      );

      setPendingDraft(
        null
      );

      setOpen(false);

      router.push(
        "/book?assistant=1"
      );
    };

  /**
   * User message Gemini API को भेजना।
   */
  const sendMessage =
    async (
      providedText
    ) => {
      const text =
        String(
          providedText ??
            input
        ).trim();

      if (
        !text ||
        loading
      ) {
        return;
      }

      /**
       * अगर booking draft पहले से मौजूद है और
       * customer confirm करता है तो booking page खोलें।
       */
      if (
        pendingDraft &&
        isConfirmation(text)
      ) {
        setMessages(
          (
            currentMessages
          ) => [
            ...currentMessages,

            {
              role:
                "user",

              text,
            },

            {
              role:
                "assistant",

              text:
                "Booking page khol raha hoon. Details check karke mobile OTP verify karein.",
            },
          ]
        );

        setInput("");

        openBookingPage(
          pendingDraft
        );

        return;
      }

      const userMessage = {
        role: "user",
        text,
      };

      const updatedMessages = [
        ...messages,
        userMessage,
      ];

      setMessages(
        updatedMessages
      );

      setInput("");
      setLoading(true);

      try {
        const data =
          await post(
            "/api/chat",
            {
              messages:
                updatedMessages,

              language:
                i18n.resolvedLanguage ||
                i18n.language ||
                "en",
            }
          );

        const assistantText =
          data.reply ||
          "Sorry, main request samajh nahi paaya.";

        setMessages(
          (
            currentMessages
          ) => [
            ...currentMessages,

            {
              role:
                "assistant",

              text:
                assistantText,
            },
          ]
        );

        if (
          data.bookingDraft
        ) {
          setPendingDraft(
            data.bookingDraft
          );
        } else {
          setPendingDraft(
            null
          );
        }
      } catch (error) {
        console.error(
          "Gemini chat error:",
          error
        );

        addAssistantMessage(
          error.message ||
            "Gemini assistant abhi available nahi hai. Thodi der baad try karein."
        );
      } finally {
        setLoading(false);
      }
    };

  /**
   * Microphone से booking command लेना।
   */
  const startListening =
    () => {
      if (loading) {
        return;
      }

      const Recognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

      if (!Recognition) {
        addAssistantMessage(
          "Is browser mein voice recognition support nahi hai. Kripya message type karein."
        );

        return;
      }

      recognitionRef.current
        ?.stop();

      const recognition =
        new Recognition();

      recognition.lang =
        speechCodeFor(
          i18n.resolvedLanguage ||
            i18n.language ||
            "en"
        );

      recognition.interimResults =
        false;

      recognition.continuous =
        false;

      recognition.maxAlternatives =
        1;

      recognition.onstart =
        () => {
          setListening(true);
        };

      recognition.onend =
        () => {
          setListening(false);
        };

      recognition.onerror =
        () => {
          setListening(false);

          addAssistantMessage(
            "Awaaz samajh nahi aayi. Dobara mic dabakar boliye."
          );
        };

      recognition.onresult =
        (event) => {
          const spokenText =
            event.results[0][0]
              .transcript;

          setInput(
            spokenText
          );

          sendMessage(
            spokenText
          );
        };

      recognitionRef.current =
        recognition;

      recognition.start();
    };

  return (
    <>
      {open && (
        <section className="fixed bottom-24 right-4 z-[100] flex h-[540px] w-[calc(100%-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {/* Chat header */}
          <header className="flex items-center justify-between bg-teal-700 p-4 text-white">
            <div>
              <p className="font-bold">
                ✨ SevaSetu
                Gemini
              </p>

              <p className="text-xs text-teal-100">
                Chat · Voice
                booking · Payment
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setOpen(false)
              }
              className="flex h-11 w-11 items-center justify-center rounded-lg text-2xl hover:bg-teal-800"
              aria-label="Close chat"
            >
              ×
            </button>
          </header>

          {/* Chat messages */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {messages.map(
              (
                message,
                index
              ) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                    message.role ===
                    "user"
                      ? "ml-auto bg-teal-600 text-white"
                      : "bg-white text-slate-700 shadow-sm"
                  }`}
                >
                  {
                    message.text
                  }
                </div>
              )
            )}

            {/* Gemini booking draft */}
            {pendingDraft && (
              <div className="rounded-2xl border border-teal-200 bg-teal-50 p-3 text-sm text-slate-700">
                <p className="font-bold text-teal-800">
                  📋 Booking
                  draft
                </p>

                <div className="mt-2 space-y-2 text-xs">
                  <p>
                    <strong>
                      Service:
                    </strong>{" "}
                    {
                      pendingDraft.service
                    }
                  </p>

                  <p>
                    <strong>
                      Work date:
                    </strong>{" "}
                    {readableBookingDate(
                      pendingDraft.scheduledAt
                    )}
                  </p>

                  <div
                    className={`rounded-lg p-2 ${
                      pendingDraft.paymentPlan ===
                      "pay_now"
                        ? "bg-blue-50 text-blue-800"
                        : "bg-emerald-50 text-emerald-800"
                    }`}
                  >
                    <p className="font-semibold">
                      {pendingDraft.paymentPlan ===
                      "pay_now"
                        ? "💳 Future booking"
                        : "🤝 आज की booking"}
                    </p>

                    <p className="mt-1">
                      {paymentPlanLabel(
                        pendingDraft
                      )}
                    </p>
                  </div>

                  <p>
                    <strong>
                      Address:
                    </strong>{" "}
                    {pendingDraft.address ||
                      "Booking page par enter karein"}
                  </p>

                  {pendingDraft.isEmergency && (
                    <p className="rounded-lg bg-rose-50 p-2 font-semibold text-rose-700">
                      🚨 Emergency
                      booking — केवल
                      आज के लिए
                    </p>
                  )}

                  {pendingDraft.notes && (
                    <p>
                      <strong>
                        Notes:
                      </strong>{" "}
                      {
                        pendingDraft.notes
                      }
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  className="btn btn-primary mt-3 w-full !py-2 text-xs"
                  onClick={() =>
                    openBookingPage(
                      pendingDraft
                    )
                  }
                >
                  Confirm and
                  continue
                </button>

                <button
                  type="button"
                  className="btn btn-ghost mt-2 w-full !py-2 text-xs"
                  onClick={() => {
                    setPendingDraft(
                      null
                    );

                    addAssistantMessage(
                      "Booking draft cancel kar diya gaya."
                    );
                  }}
                >
                  Cancel
                </button>
              </div>
            )}

            {loading && (
              <div className="w-fit rounded-2xl bg-white px-3 py-2 text-sm text-slate-500 shadow-sm">
                Gemini is
                thinking...
              </div>
            )}

            <div
              ref={
                messagesEndRef
              }
            />
          </div>

          {/* Chat input */}
          <div className="border-t bg-white p-3">
            {listening && (
              <p className="mb-2 text-center text-xs font-semibold text-red-600">
                🔴 Listening...
                बोलिए
              </p>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={
                  startListening
                }
                disabled={
                  loading
                }
                className={`btn h-11 w-11 shrink-0 !p-0 ${
                  listening
                    ? "btn-danger"
                    : "btn-ghost"
                }`}
                aria-label="Speak booking command"
                title="Speak"
              >
                {listening
                  ? "◉"
                  : "🎤"}
              </button>

              <input
                className="input"
                placeholder="Message or booking command..."
                value={input}
                disabled={
                  loading
                }
                onChange={(
                  event
                ) =>
                  setInput(
                    event.target
                      .value
                  )
                }
                onKeyDown={(
                  event
                ) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    event.preventDefault();

                    sendMessage();
                  }
                }}
              />

              <button
                type="button"
                onClick={() =>
                  sendMessage()
                }
                disabled={
                  loading ||
                  !input.trim()
                }
                className="btn btn-primary h-11 !px-4"
                aria-label="Send message"
              >
                ➤
              </button>
            </div>

            <p className="mt-2 text-center text-[11px] text-slate-400">
              OTP, card number
              या CVV chat में
              share न करें।
            </p>
          </div>
        </section>
      )}

      {/* Floating Gemini button */}
      <button
        type="button"
        onClick={() =>
          setOpen(
            (current) =>
              !current
          )
        }
        className="fixed bottom-5 right-5 z-[100] flex h-14 w-14 items-center justify-center rounded-full bg-teal-700 text-2xl text-white shadow-xl transition hover:scale-105 hover:bg-teal-800"
        aria-label="Open Gemini assistant"
        title="SevaSetu Gemini Assistant"
      >
        {open ? "×" : "✨"}
      </button>
    </>
  );
}