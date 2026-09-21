import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Load Geist Sans font and expose it as a CSS variable for Tailwind usage
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Load Geist Mono font for code/monospace elements
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Root layout with Geist fonts and global metadata. */
export const metadata: Metadata = {
  title: "GolfGive - Play Golf, Win Prizes, Change Lives",
  description:
    "A golf performance and charity platform. Track your scores, enter monthly prize draws, and support causes you care about.",
};

// Root layout wraps every page in the app — provides fonts, global CSS, and base HTML structure
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      // Apply font CSS variables and base styling (full height, font smoothing)
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* Body uses flex-col to enable sticky footer pattern with flex-1 on main */}
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
