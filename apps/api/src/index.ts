
import "dotenv/config";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { clerkMiddleware } from "@clerk/express";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import * as billingController from "./controllers/billing.controller";
import { errorHandler } from "./middleware/errorHandler";
import { globalRateLimiter } from "./middleware/rateLimiter";
import { prisma } from "./lib/prisma";9
import { routes } from "./routes";
import { ingestionQueue } from "./services/ingestion.queue";
import { startIngestionWorker } from "./services/ingestion.worker";

const app = express();
const port = Number(process.env.PORT) || 4000;

// BullBoard admin UI
const bullBoardAdapter = new ExpressAdapter();
bullBoardAdapter.setBasePath("/admin/queues");
createBullBoard({
  queues: [new BullMQAdapter(ingestionQueue)],
  serverAdapter: bullBoardAdapter,
});
app.use("/admin/queues", bullBoardAdapter.getRouter());

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true,
  }),
);
app.use(morgan("dev"));

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected", timestamp: new Date() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(503).json({ status: "error", db: "disconnected", detail: msg });
  }
});

app.post(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  billingController.stripeWebhook,
);

app.use(express.json());
app.use(globalRateLimiter);
app.use("/api", clerkMiddleware({ enableHandshake: false }), routes);

app.use(errorHandler);

export { app };

if (require.main === module) {
  startIngestionWorker();
  app.listen(port, () => {
    console.log(`DevScope API running on port ${port}`);
    console.log(`BullBoard: http://localhost:${port}/admin/queues`);
  });
}
