import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Limo Edge — educational chart analysis",
  description:
    "Upload a chart screenshot, learn EMA 50, EMA 200, RSI 14 and ATR 14, and practise entries, stops and targets on paper.",
  applicationName: "Limo Edge",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050208",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <div className="app-bg" aria-hidden="true">
          <span
            className="orb"
            style={{
              width: "22rem",
              height: "22rem",
              top: "-6rem",
              left: "-4rem",
              background: "rgba(168,85,247,0.55)",
            }}
          />
          <span
            className="orb"
            style={{
              width: "18rem",
              height: "18rem",
              top: "10rem",
              right: "-5rem",
              background: "rgba(99,102,241,0.45)",
              animationDelay: "3s",
            }}
          />
        </div>
        {children}
      </body>
    </html>
  );
}
