import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { PwaRegister } from "@/components/pwa-register";
import "react-easy-crop/react-easy-crop.css";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "CBS MASA",
    template: "%s | CBS MASA",
  },
  description: "Internal PMSA college savings Bank for student savings, current, and fixed accounts.",
  applicationName: "CBS MASA",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/cbslogo.png", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    shortcut: [{ url: "/cbslogo.png", type: "image/png" }],
    apple: [{ url: "/cbslogo.png" }],
  },
  openGraph: {
    title: "PMSA CBS",
    description: "College savings bank system",
    images: [{ url: "/cbslogo.png", width: 1200, height: 630, alt: "CBS MASA logo" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b3b2e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <PwaRegister />
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
