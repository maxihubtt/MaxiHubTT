import app from "./app";
import { logger } from "./lib/logger";
import { pollTelegramUpdates } from "./lib/telegram";
import { handleDriverClaim } from "./routes/jobs";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  setInterval(async () => {
    await pollTelegramUpdates(handleDriverClaim);
  }, 3000);

  logger.info("Telegram polling started");
});
