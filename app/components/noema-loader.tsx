"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import styles from "./noema-loader.module.css";

type Phase = "idle" | "transit" | "arrival" | "flash";

type NoemaLoaderProps = {
  label?: string;
  detail?: string;
  variant?: "inline" | "panel";
  size?: number;
  className?: string;
};

const STAGE_SIZE = 700;
const RIGHT_NODE_X = 600;
const RIGHT_NODE_Y = 300;
const LOGO_ASSET_SRC = "/brand/noema-logo/noema-logo-exact.svg";
const IDLE_ORBIT_PATH =
  'M 339 266 C 328 307 304 353 265 387 C 229 417 188 427 153 418 C 124 409 105 386 102 353 C 99 318 121 295 148 269 C 181 236 229 213 273 211 C 307 210 329 226 339 266';
const FLOW_PATH =
  'M 339 270 C 340 326 340 381 342 430 C 344 458 356 474 382 476 C 408 474 430 452 457 414 C 482 379 486 335 528 302 C 553 282 569 272 580 272';
const IDLE_LOOP_DURATION_MS = 4200;
const IDLE_LOOP_COUNT_MIN = 1;
const IDLE_LOOP_COUNT_MAX = 3;
const TRANSIT_DURATION_MS = 2800;
const ARRIVAL_SPIN_DURATION_MS = 1500;
const FLASH_DURATION_MS = 1200;

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function NoemaLoader({
  label = "Ladataan",
  detail,
  variant = "inline",
  size,
  className
}: NoemaLoaderProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [cycleIndex, setCycleIndex] = useState(0);
  const resolvedSize = size ?? (variant === "panel" ? 320 : 44);

  useEffect(() => {
    let idleTimer: number | undefined;
    let transitTimer: number | undefined;
    let arrivalTimer: number | undefined;
    let flashTimer: number | undefined;
    let cancelled = false;

    const getIdleLoopCount = () =>
      Math.floor(Math.random() * (IDLE_LOOP_COUNT_MAX - IDLE_LOOP_COUNT_MIN + 1)) + IDLE_LOOP_COUNT_MIN;

    const startCycle = () => {
      if (cancelled) {
        return;
      }

      const loopCount = getIdleLoopCount();
      setCycleIndex((current) => current + 1);
      setPhase("idle");

      idleTimer = window.setTimeout(() => {
        if (cancelled) {
          return;
        }

        setPhase("transit");

        transitTimer = window.setTimeout(() => {
          if (cancelled) {
            return;
          }

          setPhase("arrival");

          arrivalTimer = window.setTimeout(() => {
            if (cancelled) {
              return;
            }

            setPhase("flash");

            flashTimer = window.setTimeout(() => {
              startCycle();
            }, FLASH_DURATION_MS);
          }, ARRIVAL_SPIN_DURATION_MS);
        }, TRANSIT_DURATION_MS);
      }, IDLE_LOOP_DURATION_MS * loopCount);
    };

    startCycle();

    return () => {
      cancelled = true;

      if (idleTimer) {
        window.clearTimeout(idleTimer);
      }

      if (transitTimer) {
        window.clearTimeout(transitTimer);
      }

      if (arrivalTimer) {
        window.clearTimeout(arrivalTimer);
      }

      if (flashTimer) {
        window.clearTimeout(flashTimer);
      }
    };
  }, []);

  const stageStyle = useMemo(
    () =>
      ({
        "--idle-duration": `${IDLE_LOOP_DURATION_MS}ms`,
        "--transit-duration": `${TRANSIT_DURATION_MS}ms`,
        "--arrival-duration": `${ARRIVAL_SPIN_DURATION_MS}ms`,
        "--flash-duration": `${FLASH_DURATION_MS}ms`,
        "--loader-size": `${resolvedSize}px`,
        "--loader-scale": `${resolvedSize / STAGE_SIZE}`
      }) as CSSProperties,
    [resolvedSize]
  );

  const idleBallStyle = useMemo(
    () =>
      ({
        offsetPath: `path("${IDLE_ORBIT_PATH}")`
      }) as CSSProperties,
    []
  );

  const motionBallStyle = useMemo(
    () =>
      ({
        offsetPath: `path("${FLOW_PATH}")`
      }) as CSSProperties,
    []
  );

  return (
    <span
      className={joinClassNames(styles.loader, variant === "panel" ? styles.loaderPanel : styles.loaderInline, className)}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span className={styles.visualFrame} style={stageStyle}>
        <span className={styles.stageViewport}>
          <span className={styles.stage} data-phase={phase}>
            <span className={styles.ambientGlow} aria-hidden="true" />
            <span className={styles.logoLayer} aria-hidden="true">
              <object
                aria-hidden="true"
                className={styles.logoObject}
                data={LOGO_ASSET_SRC}
                tabIndex={-1}
                type="image/svg+xml"
              />
            </span>
          <svg
            className={styles.guideSvg}
            viewBox={`0 0 ${STAGE_SIZE} ${STAGE_SIZE}`}
            aria-hidden="true"
          >
              <path className={styles.leftOrbitGuide} d={IDLE_ORBIT_PATH} />
              <path className={styles.flowGuide} d={FLOW_PATH} />
            <circle className={styles.rightNodeGlow} cx={RIGHT_NODE_X} cy={RIGHT_NODE_Y} r="62" />
            <circle className={styles.rightNodeCore} cx={RIGHT_NODE_X} cy={RIGHT_NODE_Y} r="8" />
          </svg>
            <span key={cycleIndex} className={styles.idleBallAnchor} style={idleBallStyle}>
              <span className={styles.energyBall} />
            </span>
            <span className={styles.motionBall} style={motionBallStyle}>
              <span className={styles.energyBall} />
            </span>
            <span className={styles.arrivalSpinAnchor}>
              <span className={joinClassNames(styles.energyBall, styles.arrivalSpinBall)} />
            </span>
            <span className={styles.arrivalFlash} />
          </span>
        </span>
      </span>
      {variant === "panel" ? (
        <span className={styles.copy}>
          <span className={styles.label}>{label}</span>
          {detail ? <span className={styles.detail}>{detail}</span> : null}
        </span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </span>
  );
}
