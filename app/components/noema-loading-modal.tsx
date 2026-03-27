"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { NoemaLoader } from "@/app/components/noema-loader";
import styles from "./noema-loading-modal.module.css";

type NoemaLoadingModalProps = {
  open: boolean;
  label: string;
  detail?: string;
  hint?: string;
};

export function NoemaLoadingModal({
  open,
  label,
  detail,
  hint = "Tama vaihe kestaa hetken. Voit odottaa rauhassa."
}: NoemaLoadingModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loaderSize, setLoaderSize] = useState(352);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const updateLoaderSize = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const sizeByWidth = Math.max(220, Math.min(352, Math.floor(viewportWidth * 0.58)));
      const sizeByHeight = Math.max(220, Math.min(352, Math.floor(viewportHeight * 0.42)));
      setLoaderSize(Math.min(sizeByWidth, sizeByHeight));
    };

    updateLoaderSize();
    window.addEventListener("resize", updateLoaderSize);

    return () => {
      window.removeEventListener("resize", updateLoaderSize);
    };
  }, [mounted]);

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={label}>
      <div className={styles.card}>
        <NoemaLoader variant="panel" size={loaderSize} label={label} detail={detail} />
        <p className={styles.hint}>{hint}</p>
      </div>
    </div>,
    document.body
  );
}
