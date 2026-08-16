import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EventVerse | Campus Event Universe",
  description: "College event info is scattered. EventVerse gives every college its own isolated, notification-powered event universe.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#06060c] text-[#f5f5f7] font-sans antialiased selection:bg-brand-primary/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
