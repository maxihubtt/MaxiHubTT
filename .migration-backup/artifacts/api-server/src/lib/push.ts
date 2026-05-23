import webpush from "web-push";
import { db, pushSubscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@maxihubtt.com";

let configured = false;

if (publicKey && privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
} else {
  logger.warn("VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY not set — push notifications disabled");
}

export function getVapidPublicKey(): string | null {
  return publicKey ?? null;
}

export async function sendPushToAllDrivers(payload: {
  title: string;
  body: string;
  tag?: string;
}): Promise<void> {
  if (!configured) return;

  const subs = await db.select().from(pushSubscriptionsTable);
  if (subs.length === 0) return;

  const data = JSON.stringify(payload);

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          data
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, sub.endpoint));
          logger.info({ endpoint: sub.endpoint }, "Removed expired push subscription");
        } else {
          logger.warn({ err, endpoint: sub.endpoint }, "Push notification failed");
        }
      }
    })
  );
}
