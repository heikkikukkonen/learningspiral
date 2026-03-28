"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function HeaderIcon({
  active,
  children,
  className,
  href,
  label
}: {
  active: boolean;
  children: React.ReactNode;
  className?: string;
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={active ? `header-icon is-active ${className ?? ""}`.trim() : `header-icon ${className ?? ""}`.trim()}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      title={label}
    >
      {children}
    </Link>
  );
}

export function SiteNav() {
  const pathname = usePathname();
  const appHomeActive = pathname === "/app";
  const reviewActive = pathname === "/review";
  const sourcesActive = pathname === "/sources" || pathname.startsWith("/sources/");
  const settingsActive = pathname === "/settings" || pathname === "/login";
  const primaryHref = "/app";
  const primaryLabel = "Tallenna ajatus";

  return (
    <nav className="header-actions" aria-label="Primary">
      <HeaderIcon href={primaryHref} label={primaryLabel} active={appHomeActive}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4.8 18.4V20h1.6l10.5-10.5-1.6-1.6L4.8 18.4z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
          <path d="M14.5 6.9l1.6-1.6a1.5 1.5 0 012.1 0l.5.5a1.5 1.5 0 010 2.1l-1.6 1.6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
          <path d="M13.7 7.1l3.2 3.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
        </svg>
      </HeaderIcon>
      <HeaderIcon href="/review" label="Syvenny" active={reviewActive} className="header-icon-cta">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M9.4 6.3a2.9 2.9 0 00-5.2 1.8c0 .6.1 1.1.4 1.6A3.2 3.2 0 004 15.6c.8.8 1.9 1.2 3 1.2h1.5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
          <path
            d="M14.6 6.3a2.9 2.9 0 015.2 1.8c0 .6-.1 1.1-.4 1.6a3.2 3.2 0 01.5 5.9c-.8.8-1.9 1.2-3 1.2h-1.5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
          <path
            d="M12 5.3v13.2M9.2 8.4c.7.5 1.1 1.4 1.1 2.4s-.4 1.9-1.1 2.4m5.6-4.8c-.7.5-1.1 1.4-1.1 2.4s.4 1.9 1.1 2.4M8.8 16c.8-.2 1.5-.1 2.1.2.4.2.7.5 1.1.9m3.2-1.1c-.8-.2-1.5-.1-2.1.2-.4.2-.7.5-1.1.9"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        </svg>
      </HeaderIcon>
      <HeaderIcon href="/sources" label="Selaa ajatuksia" active={sourcesActive}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M14 14l4.2 4.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      </HeaderIcon>
      <HeaderIcon href="/settings" label="Asetukset" active={settingsActive}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3.75v2.1M12 18.15v2.1M5.75 12h2.1M16.15 12h2.1M7.58 7.58l1.49 1.49M14.93 14.93l1.49 1.49M16.42 7.58l-1.49 1.49M9.07 14.93l-1.49 1.49"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
          <circle cx="12" cy="12" r="5.05" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="2.15" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </HeaderIcon>
    </nav>
  );
}
