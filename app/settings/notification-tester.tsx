"use client";

import { useState } from "react";
import {
  deletePushSubscriptionAction,
  savePushSubscriptionAction,
  sendPushTestAction
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
  pushPublicKey
}: {
  pushConfigured: boolean;
  pushPublicKey: string;
}) {
  const [message, setMessage] = useState("Muista tarkistaa paivan tehtavat");
  const [status, setStatus] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isEnablingPush, setIsEnablingPush] = useState(false);

  async function sendTestNotification() {
    if (!message.trim()) {
      setStatus("Kirjoita ensin testiviesti.");
      return;
    }

    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setStatus("Tama selain tai laite ei tue PWA-ilmoituksia.");
      return;
    }

    setIsSending(true);
    setStatus("");

    try {
      let permission = Notification.permission;
      if (permission === "default") {
        permission = await Notification.requestPermission();
      }

      if (permission !== "granted") {
        setStatus("Ilmoituslupaa ei myonnetty.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification("Noema", {
        body: message.trim(),
        tag: "settings-test-notification",
        badge: "/pwa-icon-192.png",
        icon: "/pwa-icon-192.png",
        data: {
          url: "/settings"
        }
      });

      setStatus("Testi-ilmoitus lahetetty.");
    } catch (error) {
      console.error("[notifications] test send failed", error);
      setStatus("Testi-ilmoituksen lahetys epaonnistui.");
    } finally {
      setIsSending(false);
    }
  }

  async function enablePushNotifications() {
    if (!pushConfigured || !pushPublicKey) {
      setStatus("Push-asetukset puuttuvat palvelimelta.");
      return;
    }

    if (!("PushManager" in window) || !("serviceWorker" in navigator)) {
      setStatus("Tama selain tai laite ei tue push-ilmoituksia.");
      return;
    }

    setIsEnablingPush(true);
    setStatus("");

    try {
      let permission = Notification.permission;
      if (permission === "default") {
        permission = await Notification.requestPermission();
      }

      if (permission !== "granted") {
        setStatus("Ilmoituslupaa ei myonnetty.");
        return;
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

      setStatus("Push-ilmoitukset otettu kayttoon tälle laitteelle.");
    } catch (error) {
      console.error("[push] enable failed", error);
      setStatus("Push-ilmoitusten kayttoonotto epaonnistui.");
    } finally {
      setIsEnablingPush(false);
    }
  }

  async function disablePushNotifications() {
    if (!("serviceWorker" in navigator)) {
      setStatus("Service worker ei ole saatavilla.");
      return;
    }

    setIsEnablingPush(true);
    setStatus("");

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        setStatus("Talla laitteella ei ollut aktiivista push-tilausta.");
        return;
      }

      await deletePushSubscriptionAction(subscription.endpoint);
      await subscription.unsubscribe();
      setStatus("Push-ilmoitukset poistettu taman laitteen osalta.");
    } catch (error) {
      console.error("[push] disable failed", error);
      setStatus("Push-ilmoitusten poisto epaonnistui.");
    } finally {
      setIsEnablingPush(false);
    }
  }

  async function sendServerPush() {
    if (!message.trim()) {
      setStatus("Kirjoita ensin push-viesti.");
      return;
    }

    setIsSending(true);
    setStatus("");

    try {
      const result = await sendPushTestAction({ message });
      setStatus(`Server-push lahetetty ${result.sentCount} laitteelle.`);
    } catch (error) {
      console.error("[push] send failed", error);
      setStatus(error instanceof Error ? error.message : "Server-push epaonnistui.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <article className="card settings-card">
      <div className="settings-section-header">
        <div>
          <h2 style={{ margin: 0 }}>PWA-ilmoitukset</h2>
          <p className="muted" style={{ margin: "0.35rem 0 0" }}>
            Ota pushit kayttoon tälle laitteelle ja laheta testiviesti palvelimelta.
          </p>
        </div>
        <span className="pill" data-variant="primary">
          Beta
        </span>
      </div>

      <label className="form-row">
        <span>Testiviesti</span>
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Esim. Muista tarkistaa paivan tehtavat"
        />
      </label>

      <div className="actions" style={{ justifyContent: "flex-start" }}>
        <button
          type="button"
          className="secondary"
          onClick={() => void enablePushNotifications()}
          disabled={isEnablingPush || !pushConfigured}
        >
          {isEnablingPush ? "Otetaan kayttoon..." : "Ota pushit kayttoon"}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => void disablePushNotifications()}
          disabled={isEnablingPush}
        >
          Poista pushit talt laitteelta
        </button>
        <button type="button" className="primary" onClick={() => void sendTestNotification()} disabled={isSending}>
          {isSending ? "Lahetetaan..." : "Laheta testi-ilmoitus"}
        </button>
        <button
          type="button"
          className="primary"
          onClick={() => void sendServerPush()}
          disabled={isSending || !pushConfigured}
        >
          {isSending ? "Lahetetaan..." : "Laheta server-push"}
        </button>
      </div>

      {status ? (
        <p className="status" style={{ margin: "0.75rem 0 0" }}>
          {status}
        </p>
      ) : null}

      {!pushConfigured ? (
        <p className="status" style={{ margin: "0.75rem 0 0" }}>
          Aseta ymparistomuuttujat `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` ja `VAPID_SUBJECT`, jotta server-push toimii.
        </p>
      ) : null}
    </article>
  );
}
