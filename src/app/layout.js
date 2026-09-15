import "./globals.css";

import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import ChatBot from "@/components/ChatBot";

export const metadata = {
  title:
    "SevaSetu – Smart Cooperative Service Platform",

  description:
    "Book verified local service professionals with Gemini voice booking, mobile OTP, secure payment and live tracking.",
};

export default function RootLayout({
  children,
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased">
        <Providers>
          <Navbar />

          <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6">
            {children}
          </main>

          {/*
           * Normal Gemini chat +
           * conversational voice booking.
           */}
          <ChatBot />

          <footer className="border-t border-gray-200 bg-white py-6 text-center text-xs text-gray-500">
            SevaSetu · Smart
            Cooperative Service
            Platform · Built for
            Bharat 🇮🇳
          </footer>
        </Providers>
      </body>
    </html>
  );
}