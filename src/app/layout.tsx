import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://4th-quarter-sooty.vercel.app"),
  title: {
    default: "4th Quarter — Skip the first three. Catch the fourth.",
    template: "%s · 4th Quarter",
  },
  description:
    "A free notification when your NBA team's game hits the final quarter. Nothing more, nothing less.",
  applicationName: "4th Quarter",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    url: "https://4th-quarter-sooty.vercel.app",
    title: "4th Quarter — Skip the first three. Catch the fourth.",
    description:
      "A free notification when your NBA team's game hits the final quarter.",
    siteName: "4th Quarter",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "4th Quarter — Skip the first three. Catch the fourth.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "4th Quarter — Skip the first three. Catch the fourth.",
    description:
      "A free notification when your NBA team's game hits the final quarter.",
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    title: "4th Quarter",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-white">{children}</body>
    </html>
  );
}
