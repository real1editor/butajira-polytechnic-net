import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/app/providers";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Dark matte NOC theme is the default; an explicit "light" choice is honored.
const FOUC_SCRIPT = `(function(){try{var t=localStorage.getItem("bpc-theme");var d=document.documentElement.classList;if(t!=="light"){d.add("dark");}else{d.remove("dark");}}catch(e){document.documentElement.classList.add("dark");}})();`;

function resolveSiteUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  try {
    return new URL(raw);
  } catch {
    return new URL("http://localhost:3000");
  }
}

const siteUrl = resolveSiteUrl();

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "BPC Network Management",
    template: "%s · BPC Network",
  },
  description:
    "Network Asset & Cable Infrastructure Management System for Butajira Polytechnic College",
  applicationName: "BPC Network Management",
  authors: [{ name: "Butajira Polytechnic College" }],
  creator: "Butajira Polytechnic College",
  category: "Network infrastructure management",
  keywords: [
    "Butajira Polytechnic",
    "network asset management",
    "cable infrastructure",
    "network operations center",
    "inventory",
    "maintenance",
    "RBAC",
  ],
  manifest: "/manifest.webmanifest",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
  openGraph: {
    type: "website",
    siteName: "BPC Network Management",
    title: "BPC Network Management",
    description:
      "Network asset, cable, maintenance and audit management for Butajira Polytechnic College.",
    url: "/",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "BPC Network Management — Network Operations Center",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BPC Network Management",
    description:
      "Network asset, cable, maintenance and audit management for Butajira Polytechnic College.",
    images: ["/opengraph-image"],
  },
  appleWebApp: {
    capable: true,
    title: "BPC Network",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#05070a",
  colorScheme: "dark light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <script dangerouslySetInnerHTML={{ __html: FOUC_SCRIPT }} />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-cyan-400 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-950 focus:outline-none focus:ring-2 focus:ring-white/70"
        >
          Skip to content
        </a>
        <Providers>
          <Header />
          <div id="main-content" tabIndex={-1} className="flex flex-1 flex-col outline-none">
            {children}
          </div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}