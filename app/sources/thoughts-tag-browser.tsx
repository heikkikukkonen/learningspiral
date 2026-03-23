"use client";

import Link from "next/link";
import { useEffect, useState, type SyntheticEvent } from "react";

const STORAGE_KEY = "noema-thoughts-tags-open";

type ThoughtsTagItem = {
  value: string;
  label: string;
  count: number;
  href: string;
  isActive: boolean;
};

type ThoughtsTagBrowserProps = {
  items: ThoughtsTagItem[];
  activeTagLabel?: string;
};

export function ThoughtsTagBrowser({
  items,
  activeTagLabel = ""
}: ThoughtsTagBrowserProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    if (storedValue === "true") {
      setIsOpen(true);
    }
  }, []);

  function handleToggle(event: SyntheticEvent<HTMLDetailsElement>) {
    const nextOpen = event.currentTarget.open;
    setIsOpen(nextOpen);
    window.localStorage.setItem(STORAGE_KEY, nextOpen ? "true" : "false");
  }

  return (
    <details className="thoughts-tags" open={isOpen} onToggle={handleToggle}>
      <summary className="thoughts-tags-summary">
        <span className="thoughts-search-label">Selaa aihepiireja tunnisteiden avulla</span>
        {activeTagLabel ? (
          <span className="thoughts-tags-summary-note">Aktiivinen suodatus: #{activeTagLabel}</span>
        ) : null}
      </summary>

      <div className="thoughts-tags-panel">
        {items.length ? (
          <div className="thoughts-tag-list">
            {items.map((tag) => (
              <Link
                key={tag.value}
                href={tag.href}
                className="pill"
                data-variant={tag.isActive ? "primary" : undefined}
              >
                #{tag.label} <span className="thoughts-tag-count">{tag.count}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            Tunnisteet alkavat kertyvat, kun tallennat useampia ajatuksia.
          </p>
        )}
      </div>
    </details>
  );
}
