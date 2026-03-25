import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@/styles/markdown.css";
import "highlight.js/styles/github-dark.css";
import { Providers } from "./providers";
import FirestoreStatus from "@/components/ui/FirestoreStatus";
import ReferralTracker from "@/components/ReferralTracker";

const InterFont = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MetaBloom",
  description: "MetaBloom - Digital Experience Platform",
  icons: {
    icon: [
      { url: '/images/favicon_io/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/images/favicon_io/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: { url: '/images/favicon_io/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    other: [
      { url: '/images/favicon_io/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/images/favicon_io/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${InterFont.variable} `}>
        <Providers>
          <ReferralTracker />
          {children}
          <FirestoreStatus />
        </Providers>
      </body>
    </html>
  );
}
