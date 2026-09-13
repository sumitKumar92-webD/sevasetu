"use client";

import { useState } from "react";
import { post } from "@/lib/api";

export default function ChatBot() {
  const [open, setOpen] =
    useState(false);

  const [input, setInput] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [messages, setMessages] =
    useState([
      {
        role: "assistant",
        text:
          "Namaste! Main SevaSetu Assistant hoon. Aapko kaunsi service chahiye?",
      },
    ]);

  const sendMessage = async () => {
    const text = input.trim();

    if (!text || loading) {
      return;
    }

    const updatedMessages = [
      ...messages,
      {
        role: "user",
        text,
      },
    ];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const data = await post(
        "/api/chat",
        {
          messages: updatedMessages,
        }
      );

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: data.reply,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text:
            error.message ||
            "Chatbot abhi available nahi hai.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {open && (
        <section className="fixed bottom-24 right-4 z-[100] flex h-[480px] w-[calc(100%-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <header className="flex items-center justify-between bg-teal-700 p-4 text-white">
            <div>
              <p className="font-bold">
                SevaSetu Assistant
              </p>

              <p className="text-xs text-teal-100">
                AI service helper
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setOpen(false)
              }
              className="text-2xl"
              aria-label="Close chat"
            >
              ×
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {messages.map(
              (message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                    message.role ===
                    "user"
                      ? "ml-auto bg-teal-600 text-white"
                      : "bg-white text-slate-700 shadow-sm"
                  }`}
                >
                  {message.text}
                </div>
              )
            )}

            {loading && (
              <div className="w-fit rounded-2xl bg-white px-3 py-2 text-sm text-slate-500">
                Typing…
              </div>
            )}
          </div>

          <div className="flex gap-2 border-t bg-white p-3">
            <input
              className="input"
              placeholder="Ask about a service…"
              value={input}
              onChange={(event) =>
                setInput(
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter"
                ) {
                  sendMessage();
                }
              }}
            />

            <button
              type="button"
              onClick={sendMessage}
              disabled={loading}
              className="btn btn-primary !px-4 "
            >
              ➤
            </button>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() =>
          setOpen(
            (current) => !current
          )
        }
        className="fixed bottom-5 right-5 z-[100] flex h-14 w-14 items-center justify-center rounded-full bg-teal-700 text-2xl text-white shadow-xl hover:bg-teal-800"
        aria-label="Open AI assistant"
      >
        {open ? "×" : "💬"}
      </button>
    </>
  );
}