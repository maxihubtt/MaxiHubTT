import { logger } from "./logger";

const TOKEN = process.env["TELEGRAM_BOT_TOKEN"];
const GROUP_ID = process.env["TELEGRAM_GROUP_ID"];

if (!TOKEN) {
  logger.warn("TELEGRAM_BOT_TOKEN is not set — Telegram notifications disabled");
}

if (!GROUP_ID) {
  logger.warn("TELEGRAM_GROUP_ID is not set — Telegram notifications disabled");
}

const BASE_URL = TOKEN ? `https://api.telegram.org/bot${TOKEN}` : null;

async function telegramRequest(method: string, body: Record<string, unknown>): Promise<boolean> {
  if (!BASE_URL) return false;
  try {
    const res = await fetch(`${BASE_URL}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json() as { ok: boolean; description?: string };
    if (!res.ok || !data.ok) {
      logger.warn(
        { method, statusCode: res.status, description: data.description },
        "Telegram API rejected notification",
      );
      return false;
    }
    return true;
  } catch (err) {
    logger.error({ err }, "Telegram API request failed");
    return false;
  }
}

export async function sendJobToGroup(job: {
  id: string;
  pickup: string;
  dropoff: string;
  price: string;
  passengers?: string | null;
}): Promise<boolean> {
  if (!GROUP_ID) return false;

  const appDomain = process.env["APP_DOMAIN"] ?? process.env["REPLIT_DOMAINS"]?.split(",")[0];
  const portalLink = appDomain
    ? `https://${appDomain}/driver/jobs`
    : null;
  const paxLine = job.passengers ? `Pax: ${job.passengers}\n` : "";

  const markup = portalLink
    ? { inline_keyboard: [[{ text: "VIEW JOBS", url: portalLink }]] }
    : undefined;

  return telegramRequest("sendMessage", {
    chat_id: GROUP_ID,
    text: `NEW JOB #${job.id}\n\nFrom: ${job.pickup}\nTo: ${job.dropoff}\n${paxLine}Price: ${job.price}\n\nLog in to the driver portal to claim.`,
    ...(markup && { reply_markup: markup }),
  });
}

export async function sendCustomerBookingToGroup(job: {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  pickup: string;
  dropoff: string;
  price: string;
  passengers?: string | null;
  depositAmount?: number | null;
  expiresAt?: Date | null;
  urgency?: string | null;
}): Promise<boolean> {
  if (!GROUP_ID) return false;

  const appDomain = process.env["APP_DOMAIN"] ?? process.env["REPLIT_DOMAINS"]?.split(",")[0];
  const adminLink = appDomain ? `https://${appDomain}/admin/operations` : null;
  const markup = adminLink
    ? { inline_keyboard: [[{ text: "OPEN BOOKINGS", url: adminLink }]] }
    : undefined;
  const deadline = job.expiresAt
    ? job.expiresAt.toLocaleString("en-TT", {
        timeZone: "America/Port_of_Spain",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "To be confirmed";
  const deposit = job.depositAmount != null ? `TTD ${job.depositAmount.toLocaleString("en-TT")}` : "To be confirmed";
  const urgency = job.urgency === "standard" ? "Advance booking" : "Same-day / short-notice booking";

  return telegramRequest("sendMessage", {
    chat_id: GROUP_ID,
    text: [
      `NEW CUSTOMER BOOKING #${job.id}`,
      ``,
      `Customer: ${job.name}`,
      `Phone: ${job.phone}`,
      ...(job.email ? [`Email: ${job.email}`] : []),
      `From: ${job.pickup}`,
      `To: ${job.dropoff}`,
      ...(job.passengers ? [`Passengers: ${job.passengers}`] : []),
      `Pickup: ${urgency}`,
      `Fare: ${job.price}`,
      `Deposit: ${deposit}`,
      `Deposit deadline: ${deadline}`,
      ``,
      `Awaiting deposit confirmation. Drivers will be notified after payment is confirmed.`,
    ].join("\n"),
    ...(markup && { reply_markup: markup }),
  });
}

export async function notifyGroupClaimed(jobId: string, driverName: string): Promise<boolean> {
  if (!GROUP_ID) return false;
  return telegramRequest("sendMessage", {
    chat_id: GROUP_ID,
    text: `Job #${jobId} has been claimed by ${driverName}.`,
  });
}

export async function sendJobDetailsToDriver(
  chatId: number,
  job: { id: string; name: string; phone: string; pickup: string; dropoff: string }
): Promise<boolean> {
  return telegramRequest("sendMessage", {
    chat_id: chatId,
    text: `JOB CLAIMED - #${job.id}\n\nCustomer: ${job.name}\nPhone: ${job.phone}\nFrom: ${job.pickup}\nTo: ${job.dropoff}`,
  });
}

export async function notifyDriverSignup(driver: {
  full_name: string;
  phone: string;
  number_plate: string;
  dp_number: string;
  taxi_badge_number: string;
}): Promise<boolean> {
  if (!GROUP_ID) return false;

  const appDomain = process.env["APP_DOMAIN"] ?? process.env["REPLIT_DOMAINS"]?.split(",")[0];
  const adminLink = appDomain ? `https://${appDomain}/admin/drivers` : null;

  const markup = adminLink
    ? { inline_keyboard: [[{ text: "REVIEW APPLICATION", url: adminLink }]] }
    : undefined;

  return telegramRequest("sendMessage", {
    chat_id: GROUP_ID,
    text: [
      `NEW DRIVER APPLICATION`,
      ``,
      `Name: ${driver.full_name}`,
      `Phone: ${driver.phone}`,
      `Plate: ${driver.number_plate}`,
      `DP No: ${driver.dp_number}`,
      `Badge: ${driver.taxi_badge_number}`,
      ``,
      `Log in to the admin panel to approve or reject.`,
    ].join("\n"),
    ...(markup && { reply_markup: markup }),
  });
}

let lastUpdateId = 0;

export async function pollTelegramUpdates(
  onClaim: (jobId: string, driverId: number, driverName: string) => Promise<void>
): Promise<void> {
  if (!BASE_URL) return;
  try {
    const res = await fetch(
      `${BASE_URL}/getUpdates?offset=${lastUpdateId + 1}&timeout=0`
    );
    const data = await res.json() as {
      ok: boolean;
      result: Array<{
        update_id: number;
        message?: {
          text: string;
          chat: { id: number };
          from: { first_name: string };
        };
      }>;
    };

    if (!data.ok || !data.result.length) return;

    for (const update of data.result) {
      lastUpdateId = update.update_id;
      const msg = update.message;
      if (msg && msg.text && msg.text.startsWith("/start M")) {
        const jobId = msg.text.split(" ")[1];
        if (jobId) {
          await onClaim(jobId, msg.chat.id, msg.from.first_name);
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "Telegram poll failed");
  }
}
