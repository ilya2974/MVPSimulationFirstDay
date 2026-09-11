import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
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
app.use(cors());
app.use("/api/events", express.json({ limit: "5mb" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Reserve the API namespace before the SPA fallback (including unknown routes).
app.use("/api", (_req, res) => {
  res.status(404).json({ message: "API route not found" });
});

if (process.env.NODE_ENV === "production") {
  // Both src/app.ts and the bundled dist/index.mjs are one level below api-server.
  const frontendDir = fileURLToPath(new URL("../../workday-simulation/dist/public/", import.meta.url));
  const indexFile = path.join(frontendDir, "index.html");
  if (!existsSync(indexFile)) {
    throw new Error("Frontend build missing. Run pnpm run build before starting production.");
  }
  app.use(express.static(frontendDir, { index: false }));
  // Express 5 requires a named wildcard. Braces also match the root path.
  app.get("/{*path}", (req, res, next) => {
    if (path.extname(req.path) || !req.accepts("html")) {
      next();
      return;
    }
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(indexFile);
  });
}

export default app;
