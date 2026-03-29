"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

function HeaderIcon({
  active,
  className,
  href,
  iconSrc,
  label
}: {
  active: boolean;
  className?: string;
  href: string;
  iconSrc: string;
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
      <Image src={iconSrc} alt="" aria-hidden="true" width={48} height={48} className="header-icon-image" />
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
      <HeaderIcon
        href={primaryHref}
        label={primaryLabel}
        active={appHomeActive}
        className="header-icon-pen"
        iconSrc="/brand/action-icons/KirjoitaAjatus.PNG"
      />
      <HeaderIcon
        href="/review"
        label="Syvenny"
        active={reviewActive}
        className="header-icon-cta"
        iconSrc="/brand/action-icons/Syvenna.PNG"
      />
      <HeaderIcon
        href="/sources"
        label="Selaa ajatuksia"
        active={sourcesActive}
        className="header-icon-search"
        iconSrc="/brand/action-icons/SelaaAjatuksia.PNG"
      />
      <HeaderIcon
        href="/settings"
        label="Asetukset"
        active={settingsActive}
        className="header-icon-settings"
        iconSrc="/brand/action-icons/Asetukset.PNG"
      />
    </nav>
  );
}
