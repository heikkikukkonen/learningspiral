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
  const isCapturePage = pathname.startsWith("/capture");
  const sourcesActive = pathname === "/sources" || pathname.startsWith("/sources/");
  const settingsActive = pathname === "/settings" || pathname === "/login";
  const primaryHref = isCapturePage ? "/" : "/sources";
  const primaryLabel = isCapturePage ? "Etusivu" : "Haku ja ideat";

  return (
    <nav className="header-actions" aria-label="Primary">
      <HeaderIcon href={primaryHref} label={primaryLabel} active={sourcesActive}>
        {isCapturePage ? (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4.5 10.5L12 4l7.5 6.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            <path d="M6.5 9.8V20h11V9.8" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M16 16l4.5 4.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          </svg>
        )}
      </HeaderIcon>
      <HeaderIcon href="/settings" label="Asetukset" active={settingsActive}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3.5l1.3 2.4 2.7.5-.9 2.6 1.9 2-1.9 2 .9 2.6-2.7.5L12 20.5l-1.3-2.4-2.7-.5.9-2.6-1.9-2 1.9-2-.9-2.6 2.7-.5L12 3.5z"
            fill="none"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.7"
          />
          <circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      </HeaderIcon>
    </nav>
  );
}
