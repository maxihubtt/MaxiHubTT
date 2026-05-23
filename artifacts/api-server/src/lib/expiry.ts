import { lt, and, eq, isNotNull } from "drizzle-orm";
import { db, jobsTable } from "@workspace/db";
import { logger } from "./logger";

export function startExpiryJob(): void {
  setInterval(async () => {
    try {
      const now = new Date();
      const expired = await db
        .update(jobsTable)
        .set({ status: "expired", updatedAt: now })
        .where(
          and(
            eq(jobsTable.depositPaid, false),
            eq(jobsTable.status, "pending_deposit"),
            isNotNull(jobsTable.expiresAt),
            lt(jobsTable.expiresAt, now)
          )
        )
        .returning({ id: jobsTable.id });

      if (expired.length > 0) {
        logger.info({ count: expired.length, ids: expired.map(j => j.id) }, "Expired pending-deposit bookings");
      }
    } catch (err) {
      logger.error({ err }, "Expiry job error");
    }
  }, 60_000);

  logger.info("Booking expiry job started (60s interval)");
}
