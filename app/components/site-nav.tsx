"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function HeaderIcon({
  active,
  children,
  href,
  label
}: {
  active: boolean;
  children: React.ReactNode;
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={active ? "header-icon is-active" : "header-icon"}
      aria-current={active ? "page" : undefined}
      title={label}
    >
      <span className="header-icon-mark" aria-hidden="true">
        {children}
      </span>
      <span className="header-icon-label">{label}</span>
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
  const primaryLabel = "Tallenna";

  return (
    <nav className="header-actions" aria-label="Primary">
      <HeaderIcon href={primaryHref} label={primaryLabel} active={appHomeActive}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4.5 10.2L12 4l7.5 6.2V19a1 1 0 01-1 1h-4.4v-5.4h-4.2V20H5.5a1 1 0 01-1-1v-8.8z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      </HeaderIcon>
      <HeaderIcon href="/review" label="Syvenny" active={reviewActive}>
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
            d="M12 5.3v13.2M9.2 8.4c.7.5 1.1 1.4 1.1 2.4s-.4 1.9-1.1 2.4m5.6-4.8c-.7.5-1.1 1.4-1.1 2.4s.4 1.9 1.1 2.4"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        </svg>
      </HeaderIcon>
      <HeaderIcon href="/sources" label="Ajatukset" active={sourcesActive}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M16 16l4.5 4.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
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
