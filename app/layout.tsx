import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Wellness | Daily Discipline",
  description: "Premium personal daily discipline tracker",
  appleWebApp: {
    title: "Wellness",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents zooming on inputs for native app feel
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="antialiased selection:bg-[#10B981] selection:text-white"
    >
      <body
        className={`${inter.variable} font-sans bg-transparent`}
      >
        {children}
      </body>
    </html>
  );
}
