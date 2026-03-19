import type { Metadata } from "next";
import Link from "next/link";
import { PwaRegister } from "./components/pwa-register";
import { SiteNav } from "./components/site-nav";
import { UserAuthControls } from "./components/user-auth-controls";
import "./globals.css";

export const metadata: Metadata = {
  title: "Noema",
  description: "Rauhallinen tila ajatella, tallentaa oivalluksia ja palata niihin.",
  manifest: "/manifest.webmanifest",
  other: {
    "mobile-web-app-capable": "yes"
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Noema"
  }
};

export default async function RootLayout({
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
                <span className="logo-copy">
                  <span className="logo-title">Noema</span>
                </span>
              </Link>
            </div>
            <div className="topbar-actions">
              <SiteNav />
              <UserAuthControls />
            </div>
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
