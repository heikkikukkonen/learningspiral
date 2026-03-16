"use client";

import { useState } from "react";

export function NotificationTester() {
  const [message, setMessage] = useState("Muista tarkistaa paivan tehtavat");
  const [status, setStatus] = useState("");
  const [isSending, setIsSending] = useState(false);

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
      await registration.showNotification("LearningSpiral", {
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

  return (
    <article className="card settings-card">
      <div className="settings-section-header">
        <div>
          <h2 style={{ margin: 0 }}>PWA-ilmoitukset</h2>
          <p className="muted" style={{ margin: "0.35rem 0 0" }}>
            Testaa, voiko asennettu sovellus nayttaa ilmoituksen puhelimessa.
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
        <button type="button" className="primary" onClick={() => void sendTestNotification()} disabled={isSending}>
          {isSending ? "Lahetetaan..." : "Laheta testi-ilmoitus"}
        </button>
      </div>

      {status ? (
        <p className="status" style={{ margin: "0.75rem 0 0" }}>
          {status}
        </p>
      ) : null}
    </article>
  );
}
