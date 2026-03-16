import webpush from "web-push";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

export function getPushPublicKey(): string {
  return getEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
}

function getPushConfig() {
  return {
    publicKey: getEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY"),
    privateKey: getEnv("VAPID_PRIVATE_KEY"),
    subject: getEnv("VAPID_SUBJECT")
  };
}

export function isPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT
  );
}

function getWebPush() {
  const config = getPushConfig();
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  return webpush;
}

export async function sendWebPush(
  subscription: Record<string, unknown>,
  payload: PushPayload
) {
  const webPush = getWebPush();
  return webPush.sendNotification(
    subscription as unknown as Parameters<typeof webpush.sendNotification>[0],
    JSON.stringify(payload)
  );
}
