import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YATRA AI | Your journey, beautifully connected",
  description:
    "Explore India with personal itineraries, thoughtful local stays, heritage stories and travel plans that adapt with you.",
  robots: { index: false, follow: false },
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
