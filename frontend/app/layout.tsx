import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NextTopLoader from "nextjs-toploader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Online İmtahan Platforması - AI dəstəklı imtahan sistemi",
    template: "%s | Online İmtahan Platforması",
  },
  description:
    "AI dəstəklı online imtahan sistemi - müəllimlər üçün asan, şagirdlər üçün şəffaf və sürətli. Yüksək nəticələr göstər, mükafatlar qazan!",
  keywords: [
    "online imtahan",
    "imtahan sistemi",
    "AI imtahan",
    "online test",
    "elektron imtahan",
    "Azərbaycan",
    "təhsil",
    "şagird",
    "müəllim",
  ],
  authors: [{ name: "Online İmtahan Platforması" }],
  creator: "Online İmtahan Platforması",
  publisher: "Online İmtahan Platforması",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "az_AZ",
    url: "/",
    title: "Online İmtahan Platforması - AI dəstəklı imtahan sistemi",
    description:
      "AI dəstəklı online imtahan sistemi - müəllimlər üçün asan, şagirdlər üçün şəffaf və sürətli. Yüksək nəticələr göstər, mükafatlar qazan!",
    siteName: "Online İmtahan Platforması",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Online İmtahan Platforması",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Online İmtahan Platforması - AI dəstəklı imtahan sistemi",
    description:
      "AI dəstəklı online imtahan sistemi - müəllimlər üçün asan, şagirdlər üçün şəffaf və sürətli.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Add verification codes when available
    // google: "verification_token",
    // yandex: "verification_token",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="az">
      <head>
        <link
          rel="canonical"
          href={process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5"
        />
        <meta name="theme-color" content="#4f46e5" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className={inter.className}>
        <NextTopLoader showSpinner={false} />
        {children}
      </body>
    </html>
  );
}
