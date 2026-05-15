import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// In production with a separate frontend domain, set ALLOWED_ORIGIN to your
// frontend URL (e.g. https://your-app.vercel.app). Leave unset for same-origin.
const allowedOrigin = process.env.ALLOWED_ORIGIN;
app.use(cors({
  origin: allowedOrigin ?? true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// When the frontend and backend are on different domains (ALLOWED_ORIGIN is set),
// cookies must be sameSite:"none" + secure:true or browsers will silently drop them.
const crossOrigin = Boolean(allowedOrigin);
app.use(
  session({
    secret: process.env.SESSION_SECRET ?? "fallback-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: crossOrigin || process.env.NODE_ENV === "production",
      sameSite: crossOrigin ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use("/api", router);

// Global error handler — catches unhandled route errors and returns JSON
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "Internal server error";
  logger.error({ err, url: req.url, method: req.method }, "Unhandled route error");
  if (!res.headersSent) {
    res.status(500).json({ error: message });
  }
});

export default app;
