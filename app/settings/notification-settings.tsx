"use client";

import { useEffect, useMemo, useState } from "react";
import type { PushSubscriptionRow, UserNotificationSettings } from "@/lib/db";
import {
  deletePushSubscriptionAction,
  savePushSubscriptionAction,
  sendQueueReminderTestAction
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

type DeviceRow = {
  endpoint: string;
  deviceLabel: string;
  isCurrent: boolean;
  isEnabled: boolean;
};

export function NotificationSettings({
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
  const [status, setStatus] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [currentEndpoint, setCurrentEndpoint] = useState("");
  const [deviceItems, setDeviceItems] = useState<DeviceItem[]>(initialDevices);
  const [currentDeviceLabel, setCurrentDeviceLabel] = useState("Tämä laite");

  const detectedTimezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || initialSettings.morningReminderTimezone,
    [initialSettings.morningReminderTimezone]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentDeviceState() {
      if (!("serviceWorker" in navigator)) return;

      setCurrentDeviceLabel(detectDeviceLabel());

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

    void loadCurrentDeviceState();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentDeviceIsEnabled = Boolean(
    currentEndpoint && deviceItems.some((item) => item.endpoint === currentEndpoint)
  );

  const deviceRows: DeviceRow[] = useMemo(() => {
    const rows: DeviceRow[] = deviceItems.map((item) => ({
      endpoint: item.endpoint,
      deviceLabel: item.device_label || "Tuntematon laite",
      isCurrent: item.endpoint === currentEndpoint,
      isEnabled: true
    }));

    if (!rows.some((row) => row.isCurrent)) {
      rows.unshift({
        endpoint: currentEndpoint || "__current_device__",
        deviceLabel: currentDeviceLabel,
        isCurrent: true,
        isEnabled: currentDeviceIsEnabled
      });
    }

    return rows;
  }, [currentDeviceIsEnabled, currentDeviceLabel, currentEndpoint, deviceItems]);

  async function enableCurrentDevice() {
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
    setCurrentDeviceLabel(deviceLabel);
    setDeviceItems((current) => {
      const next = current.filter((item) => item.endpoint !== subscription.endpoint);
      return [{ endpoint: subscription.endpoint, device_label: deviceLabel }, ...next];
    });
  }

  async function disableDevice(row: DeviceRow) {
    if (row.isCurrent && "serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription?.endpoint) {
        await deletePushSubscriptionAction(subscription.endpoint);
        await subscription.unsubscribe();
      } else if (currentEndpoint) {
        await deletePushSubscriptionAction(currentEndpoint);
      }
      setCurrentEndpoint("");
    } else if (row.endpoint && row.endpoint !== "__current_device__") {
      await deletePushSubscriptionAction(row.endpoint);
    }

    setDeviceItems((current) => current.filter((item) => item.endpoint !== row.endpoint));
  }

  async function handleToggle(row: DeviceRow) {
    setIsWorking(true);
    setStatus("");

    try {
      if (row.isCurrent && !row.isEnabled) {
        await enableCurrentDevice();
        setStatus("Ilmoitukset on otettu käyttöön tällä laitteella.");
      } else {
        await disableDevice(row);
        setStatus(
          row.isCurrent
            ? "Ilmoitukset poistettiin käytöstä tällä laitteella."
            : `Ilmoitukset poistettiin käytöstä laitteelta ${row.deviceLabel}.`
        );
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Ilmoituksen tilan vaihto epäonnistui.");
    } finally {
      setIsWorking(false);
    }
  }

  async function sendTestNow() {
    setIsWorking(true);
    setStatus("");

    try {
      const result = await sendQueueReminderTestAction();
      setStatus(
        `Testilähetys lähti ${result.sentCount} laitteelle. Jonossa oli ${result.queueCount} syvennettävää asiaa.`
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Testilähetys epäonnistui.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <article className="card settings-card">
      <input type="hidden" name="morningReminderEnabled" value={String(deviceItems.length > 0)} />
      <input type="hidden" name="morningReminderTimezone" value={detectedTimezone} />

      <div className="settings-section-header">
        <div>
          <h2 style={{ margin: 0 }}>Sovelluksen ilmoitukset</h2>
          <p className="muted" style={{ margin: "0.35rem 0 0" }}>
            Voit valita alta haluamasi automaattiset ilmoitukset käyttöön.
          </p>
        </div>
      </div>

      <div className="settings-subsection-copy">
        <h3 style={{ margin: 0 }}>Avoinna olevien syvennettävien asioiden määrä</h3>
      </div>

      <div className="notification-device-list">
        {deviceRows.map((row) => (
          <div key={row.endpoint} className="notification-row">
            <div className="notification-row-copy">
              <strong>
                {row.deviceLabel}
                {row.isCurrent ? " (tämä laite)" : ""}
              </strong>
              <span className="muted">
                {row.isCurrent
                  ? row.isEnabled
                    ? "Poista käytöstä tällä laitteella"
                    : "Ota käyttöön tällä laitteella"
                  : row.isEnabled
                    ? "Poista käytöstä tällä laitteella"
                    : "Ei käytössä tällä laitteella"}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={row.isEnabled}
              className={`notification-toggle${row.isEnabled ? " is-on" : ""}`}
              onClick={() => void handleToggle(row)}
              disabled={isWorking || (!row.isCurrent && !row.isEnabled)}
            >
              <span className="notification-toggle-knob" />
            </button>
          </div>
        ))}
      </div>

      <label className="form-row" style={{ marginTop: "1rem" }}>
        <span>Valitse ilmoituksen lähetyksen kellonaika</span>
        <input
          type="time"
          name="morningReminderTime"
          value={morningTime}
          onChange={(event) => setMorningTime(event.target.value)}
        />
      </label>

      <div className="actions" style={{ justifyContent: "flex-start" }}>
        <button type="button" className="primary" onClick={() => void sendTestNow()} disabled={isWorking || !pushConfigured}>
          {isWorking ? "Lähetetään..." : "Testaa lähetys nyt"}
        </button>
      </div>

      {status ? (
        <p className="status" style={{ margin: "0.75rem 0 0" }}>
          {status}
        </p>
      ) : null}

      {!pushConfigured ? (
        <p className="status" style={{ margin: "0.75rem 0 0" }}>
          Aseta ympäristömuuttujat `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` ja
          `CRON_SECRET`, jotta push-ilmoitukset toimivat.
        </p>
      ) : null}

      <style jsx>{`
        .notification-device-list {
          display: grid;
          gap: 0.75rem;
        }

        .notification-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1rem 1.1rem;
          border: 1px solid var(--border);
          border-radius: 16px;
          background: rgba(148, 163, 184, 0.08);
        }

        .notification-row-copy {
          display: grid;
          gap: 0.2rem;
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
      `}</style>
    </article>
  );
}
