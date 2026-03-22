"use client";

import { useEffect, useState } from "react";
import type { UserNotificationSettings } from "@/lib/db";
import {
  deletePushSubscriptionAction,
  saveMorningReminderSettingsAction,
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

export function NotificationTester({
  pushConfigured,
  pushPublicKey,
  initialSettings,
  pushDeviceCount
}: {
  pushConfigured: boolean;
  pushPublicKey: string;
  initialSettings: UserNotificationSettings;
  pushDeviceCount: number;
}) {
  const [morningTime, setMorningTime] = useState(initialSettings.morningReminderTime);
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasDeviceSubscription, setHasDeviceSubscription] = useState(false);
  const [deviceCount, setDeviceCount] = useState(pushDeviceCount);

  useEffect(() => {
    let cancelled = false;

    async function loadSubscriptionState() {
      if (!("serviceWorker" in navigator)) return;

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!cancelled) {
          setHasDeviceSubscription(Boolean(subscription));
        }
      } catch {
        if (!cancelled) {
          setHasDeviceSubscription(false);
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

    const subscriptionJson = subscription.toJSON();
    await savePushSubscriptionAction({
      endpoint: subscription.endpoint,
      subscription: {
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime,
        ...subscriptionJson
      }
    });

    setHasDeviceSubscription(true);
    if (!existingSubscription) {
      setDeviceCount((current) => current + 1);
    }
  }

  async function enableMorningReminder() {
    setIsSaving(true);
    setStatus("");

    try {
      await ensurePushSubscription();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      await saveMorningReminderSettingsAction({
        enabled: true,
        time: morningTime,
        timezone
      });
      setStatus(`Aamu-ilmoitus on käytössä. Lähetys tulee joka aamu klo ${morningTime}.`);
    } catch (error) {
      console.error("[push] enable morning reminder failed", error);
      setStatus(error instanceof Error ? error.message : "Ilmoituksen käyttöönotto epäonnistui.");
    } finally {
      setIsSaving(false);
    }
  }

  async function disableMorningReminder() {
    setIsSaving(true);
    setStatus("");

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || initialSettings.morningReminderTimezone;
      await saveMorningReminderSettingsAction({
        enabled: false,
        time: morningTime,
        timezone
      });
      setStatus("Aamu-ilmoitus poistettiin käytöstä.");
    } catch (error) {
      console.error("[push] disable morning reminder failed", error);
      setStatus(error instanceof Error ? error.message : "Ilmoituksen poistaminen epäonnistui.");
    } finally {
      setIsSaving(false);
    }
  }

  async function disablePushNotifications() {
    if (!("serviceWorker" in navigator)) {
      setStatus("Service worker ei ole saatavilla.");
      return;
    }

    setIsSaving(true);
    setStatus("");

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        setHasDeviceSubscription(false);
        setStatus("Tällä laitteella ei ollut aktiivista ilmoituslaitetta.");
        return;
      }

      await deletePushSubscriptionAction(subscription.endpoint);
      await subscription.unsubscribe();
      setHasDeviceSubscription(false);
      setDeviceCount((current) => Math.max(0, current - 1));
      setStatus("Ilmoitukset poistettiin tältä laitteelta.");
    } catch (error) {
      console.error("[push] disable failed", error);
      setStatus("Ilmoitusten poisto tältä laitteelta epäonnistui.");
    } finally {
      setIsSaving(false);
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
          Aktiivisia ilmoituslaitteita: {deviceCount}
        </p>
      </div>

      <label className="form-row">
        <span>Aamu-ilmoituksen kellonaika</span>
        <input type="time" value={morningTime} onChange={(event) => setMorningTime(event.target.value)} />
      </label>

      <div className="actions" style={{ justifyContent: "flex-start" }}>
        <button
          type="button"
          className="primary"
          onClick={() => void enableMorningReminder()}
          disabled={isSaving || !pushConfigured}
        >
          {isSaving ? "Tallennetaan..." : "Ota ilmoitus käyttöön"}
        </button>
        <button type="button" className="secondary" onClick={() => void disableMorningReminder()} disabled={isSaving}>
          Poista ilmoitus käytöstä
        </button>
        <button type="button" className="secondary" onClick={() => void disablePushNotifications()} disabled={isSaving}>
          Poista ilmoitukset tältä laitteelta
        </button>
        <button type="button" className="primary" onClick={() => void sendPreview()} disabled={isSending || !pushConfigured}>
          {isSending ? "Lähetetään..." : "Testaa ilmoituksen lähetystä"}
        </button>
      </div>

      {hasDeviceSubscription ? (
        <p className="status" style={{ margin: "0.75rem 0 0" }}>
          Tämä laite on liitetty ilmoituksiin.
        </p>
      ) : null}

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
    </article>
  );
}
