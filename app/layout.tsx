import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "LearningSpiral",
  description: "MVP 0.2 UI for capture chat, summary, cards, review and progress."
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
              <Link href="/capture">Capture</Link>
              <Link href="/sources">Sources</Link>
              <Link href="/review">Review</Link>
              <Link href="/progress">Progress</Link>
              <Link href="/login">Login</Link>
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
