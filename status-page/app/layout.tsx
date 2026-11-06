import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display/serif face for headlines only -- landing-page-playbook.md's three-role type system:
// a serif statement face for headlines, a boring sans for body, mono reserved for data/labels.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["600", "900"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Shankh — credentials that quarantine themselves",
  description:
    "Credentials stolen by a malicious package quarantine and deactivate themselves, on evidence a compromised publisher can't suppress. Live ENS + Arkiv status for ETHGlobal Mumbai 2026.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="grain" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
