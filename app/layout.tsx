import type { Metadata } from "next";
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

const FOUC_SCRIPT = `(function(){try{var t=localStorage.getItem("bpc-theme");var dark=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(dark){document.documentElement.classList.add("dark");}}catch(e){}})();`;

export const metadata: Metadata = {
  title: {
    default: "BPC Network Management",
    template: "%s · BPC Network",
  },
  description:
    "Network Asset & Cable Infrastructure Management System for Butajira Polytechnic College",
  applicationName: "BPC Network Management",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
<html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        suppressHydrationWarning
      >
        <body className="min-h-full flex flex-col">
          <script dangerouslySetInnerHTML={{ __html: FOUC_SCRIPT }} />
          <Providers>
            <Header />
            {children}
            <Footer />
          </Providers>
        </body>
      </html>
  );
}