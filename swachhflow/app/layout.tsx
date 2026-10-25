import type { Metadata } from "next";
import "./globals.css";
import "./swachhflow.css";
import "./readability.css";

export const metadata: Metadata = {
  title: "SwachhFlow · Sanitation, in sync",
  description: "A map-first workspace for thoughtful public sanitation operations in Mira Bhayandar.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
