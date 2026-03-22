"use client";

import { useEffect, useMemo, useState } from "react";
import type { PushSubscriptionRow, UserNotificationSettings } from "@/lib/db";
import {
  deletePushSubscriptionAction,
  savePushSubscriptionAction,
  sendMorningReminderPreviewAction
} from "./actions";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function detectDeviceLabel() {
  const userAgent = navigator.userAgent;
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ||
    navigator.platform ||
    "";

  const browser = userAgent.includes("Edg/")
    ? "Edge"
    : userAgent.includes("Chrome/")
      ? "Chrome"
      : userAgent.includes("Firefox/")
        ? "Firefox"
        : userAgent.includes("Safari/")
          ? "Safari"
          : "Selain";

  const os = /iPhone|iPad|iPod/.test(userAgent)
    ? "iOS"
    : /Android/.test(userAgent)
      ? "Android"
      : /Windows/.test(platform) || /Windows/.test(userAgent)
        ? "Windows"
        : /Mac/.test(platform) || /Mac OS X/.test(userAgent)
          ? "macOS"
          : /Linux/.test(platform) || /Linux/.test(userAgent)
            ? "Linux"
            : "laite";

  return `${browser} / ${os}`;
}

type DeviceItem = Pick<PushSubscriptionRow, "endpoint" | "device_label">;

export function NotificationTester({
  pushConfigured,
  pushPublicKey,
  initialSettings,
  initialDevices
}: {
  pushConfigured: boolean;
  pushPublicKey: string;
  initialSettings: UserNotificationSettings;
  initialDevices: DeviceItem[];
}) {
  const [morningTime, setMorningTime] = useState(initialSettings.morningReminderTime);
  const [isReminderEnabled, setIsReminderEnabled] = useState(initialSettings.morningReminderEnabled);
  const [status, setStatus] = useState("");
  const [isToggling, setIsToggling] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [currentEndpoint, setCurrentEndpoint] = useState("");
  const [deviceItems, setDeviceItems] = useState<DeviceItem[]>(initialDevices);

  const detectedTimezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || initialSettings.morningReminderTimezone,
    [initialSettings.morningReminderTimezone]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadSubscriptionState() {
      if (!("serviceWorker" in navigator)) return;

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!cancelled) {
          setCurrentEndpoint(subscription?.endpoint ?? "");
        }
      } catch {
        if (!cancelled) {
          setCurrentEndpoint("");
        }
      }
    }

    void loadSubscriptionState();
    return () => {
      cancelled = true;
    };
  }, []);

  async function ensurePushSubscription() {
    if (!pushConfigured || !pushPublicKey) {
      throw new Error("Push-asetukset puuttuvat palvelimelta.");
    }

    if (!("PushManager" in window) || !("serviceWorker" in navigator)) {
      throw new Error("Tämä selain tai laite ei tue push-ilmoituksia.");
    }

    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      throw new Error("Ilmoituslupaa ei myönnetty.");
    }

    const registration = await navigator.serviceWorker.ready;
    const existingSubscription = await registration.pushManager.getSubscription();
    const subscription =
      existingSubscription ||
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pushPublicKey)
      }));

    const deviceLabel = detectDeviceLabel();
    const subscriptionJson = subscription.toJSON();
    await savePushSubscriptionAction({
      endpoint: subscription.endpoint,
      deviceLabel,
      subscription: {
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime,
        ...subscriptionJson
      }
    });

    setCurrentEndpoint(subscription.endpoint);
    setDeviceItems((current) => {
      const next = current.filter((item) => item.endpoint !== subscription.endpoint);
      return [{ endpoint: subscription.endpoint, device_label: deviceLabel }, ...next];
    });
  }

  async function disableCurrentDevice() {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      setCurrentEndpoint("");
      return;
    }

    await deletePushSubscriptionAction(subscription.endpoint);
    await subscription.unsubscribe();
    setCurrentEndpoint("");
    setDeviceItems((current) => current.filter((item) => item.endpoint !== subscription.endpoint));
  }

  async function handleToggle() {
    setIsToggling(true);
    setStatus("");

    try {
      if (isReminderEnabled) {
        await disableCurrentDevice();
        setIsReminderEnabled(false);
        setStatus("Ilmoitus on nyt pois päältä tälle laitteelle. Tallenna asetukset, jos haluat säilyttää muutoksen.");
      } else {
        await ensurePushSubscription();
        setIsReminderEnabled(true);
        setStatus("Ilmoitus on nyt päällä tälle laitteelle. Tallenna asetukset, jotta aamu-ilmoitus jää käyttöön.");
      }
    } catch (error) {
      console.error("[push] toggle failed", error);
      setStatus(error instanceof Error ? error.message : "Ilmoituksen tilan vaihto epäonnistui.");
    } finally {
      setIsToggling(false);
    }
  }

  async function sendPreview() {
    setIsSending(true);
    setStatus("");

    try {
      const result = await sendMorningReminderPreviewAction();
      setStatus(
        `Testi-ilmoitus lähetettiin ${result.sentCount} laitteelle. Viestissä kerrottiin ${result.queueCount} syvennettävää asiaa.`
      );
    } catch (error) {
      console.error("[push] preview send failed", error);
      setStatus(error instanceof Error ? error.message : "Testi-ilmoituksen lähetys epäonnistui.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <article className="card settings-card">
      <input type="hidden" name="morningReminderEnabled" value={String(isReminderEnabled)} />
      <input type="hidden" name="morningReminderTimezone" value={detectedTimezone} />

      <div className="settings-section-header">
        <div>
          <h2 style={{ margin: 0 }}>Sovelluksen ilmoitukset</h2>
          <p className="muted" style={{ margin: "0.35rem 0 0" }}>
            Saat joka aamu valitsemaasi aikaan ilmoituksen, joka kertoo montako asiaa sinulla on syvennettävänä.
          </p>
        </div>
      </div>

      <div className="settings-subsection-copy">
        <p className="muted" style={{ margin: 0 }}>
          Ilmoitus lähetetään vain tämän käyttäjän omille laitteille, joilla push-ilmoitukset on otettu käyttöön.
        </p>
        <p className="status" style={{ margin: "0.5rem 0 0" }}>
          Aktiivisia ilmoituslaitteita: {deviceItems.length}
        </p>
        {deviceItems.length > 0 ? (
          <div className="notification-device-list">
            {deviceItems.map((item) => (
              <span
                key={item.endpoint}
                className={`pill${item.endpoint === currentEndpoint ? " notification-device-pill-current" : ""}`}
              >
                {item.device_label || "Tuntematon laite"}
                {item.endpoint === currentEndpoint ? " (tämä laite)" : ""}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="notification-toggle-shell">
        <div className="notification-toggle-copy">
          <p className="status" style={{ margin: 0 }}>
            Tila
          </p>
          <strong>{isReminderEnabled ? "Ilmoitus on päällä" : "Ilmoitus on pois päältä"}</strong>
          <p className="muted" style={{ margin: "0.35rem 0 0" }}>
            {isReminderEnabled
              ? `Aamu-ilmoitus lähtee joka päivä klo ${morningTime}.`
              : "Laita ilmoitus päälle, jos haluat saada aamumuistutuksen syvennettävistä asioista."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isReminderEnabled}
          className={`notification-toggle${isReminderEnabled ? " is-on" : ""}`}
          onClick={() => void handleToggle()}
          disabled={isToggling || !pushConfigured}
        >
          <span className="notification-toggle-knob" />
          <span className="sr-only">{isReminderEnabled ? "Poista ilmoitus käytöstä" : "Ota ilmoitus käyttöön"}</span>
        </button>
      </div>

      <label className="form-row">
        <span>Aamu-ilmoituksen kellonaika</span>
        <input
          type="time"
          name="morningReminderTime"
          value={morningTime}
          onChange={(event) => setMorningTime(event.target.value)}
          disabled={isToggling}
        />
      </label>

      <div className="actions" style={{ justifyContent: "flex-start" }}>
        <button type="button" className="primary" onClick={() => void sendPreview()} disabled={isSending || !pushConfigured}>
          {isSending ? "Lähetetään..." : "Testaa ilmoituksen lähetystä"}
        </button>
      </div>

      {status ? (
        <p className="status" style={{ margin: "0.75rem 0 0" }}>
          {status}
        </p>
      ) : null}

      {!pushConfigured ? (
        <p className="status" style={{ margin: "0.75rem 0 0" }}>
          Aseta ympäristömuuttujat `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` ja `CRON_SECRET`, jotta ajastetut ilmoitukset toimivat tuotannossa.
        </p>
      ) : null}

      <style jsx>{`
        .notification-toggle-shell {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1rem 1.1rem;
          border: 1px solid var(--border);
          border-radius: 16px;
          background: ${isReminderEnabled ? "rgba(11, 79, 108, 0.08)" : "rgba(148, 163, 184, 0.08)"};
        }

        .notification-toggle-copy {
          display: grid;
          gap: 0.2rem;
        }

        .notification-toggle-copy strong {
          font-size: 1rem;
          line-height: 1.2;
          color: var(--text);
        }

        .notification-device-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.6rem;
        }

        .notification-device-pill-current {
          border-color: rgba(11, 79, 108, 0.22);
          background: rgba(11, 79, 108, 0.08);
        }

        .notification-toggle {
          position: relative;
          width: 3.8rem;
          height: 2.2rem;
          border-radius: 999px;
          border: 1px solid transparent;
          background: #cbd5e1;
          padding: 0.2rem;
          flex-shrink: 0;
          transition: background 0.2s ease;
        }

        .notification-toggle.is-on {
          background: #0b4f6c;
        }

        .notification-toggle-knob {
          display: block;
          width: 1.55rem;
          height: 1.55rem;
          border-radius: 999px;
          background: #fff;
          transform: translateX(0);
          transition: transform 0.2s ease;
          box-shadow: 0 3px 10px rgba(15, 23, 42, 0.18);
        }

        .notification-toggle.is-on .notification-toggle-knob {
          transform: translateX(1.55rem);
        }

        @media (max-width: 640px) {
          .notification-toggle-shell {
            align-items: flex-start;
          }
        }
      `}</style>
    </article>
  );
}
