import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "LearningSpiral",
  description: "MVP 0.1 UI prototype for source -> summary -> cards -> review"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fi">
      <body>
        <header className="topbar">
          <div className="container topbar-inner">
            <Link href="/" className="logo">
              LearningSpiral
            </Link>
            <nav className="nav">
              <Link href="/sources">Sources</Link>
              <Link href="/review">Review</Link>
              <Link href="/login">Login</Link>
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
