import type { Metadata } from "next";
import Link from "next/link";
import { PwaRegister } from "./components/pwa-register";
import { SiteNav } from "./components/site-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "LearningSpiral",
  description: "LearningSpiral 0.3.0 UI for capture, summary, cards, review and progress.",
  manifest: "/manifest.webmanifest",
  other: {
    "mobile-web-app-capable": "yes"
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LearningSpiral"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const buildVersion = process.env.NEXT_PUBLIC_BUILD_VERSION ?? "dev";

  return (
    <html lang="fi">
      <body>
        <PwaRegister />
        <header className="topbar">
          <div className="container topbar-inner">
            <div className="brand-lockup">
              <Link href="/" className="logo">
                <span className="logo-title">Learning Spiral</span>
                <span className="logo-tagline">Your thinking space</span>
              </Link>
            </div>
            <SiteNav />
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="container app-footer">
          <span className="status">Build {buildVersion}</span>
        </footer>
      </body>
    </html>
  );
}
