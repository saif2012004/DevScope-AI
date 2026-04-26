import { Router } from "express";
import * as chatController from "../controllers/chat.controller";
import { planGate } from "../middleware/planGate";
import { requireAuth } from "../middleware/requireAuth";

export const chatRoutes = Router();

chatRoutes.post("/sessions", requireAuth, chatController.createSession);
chatRoutes.get("/sessions", requireAuth, chatController.listSessions);
chatRoutes.get(
  "/sessions/:sessionId/messages",
  requireAuth,
  chatController.getMessages,
);
chatRoutes.delete(
  "/sessions/:sessionId",
  requireAuth,
  chatController.deleteSession,
);
chatRoutes.post(
  "/query",
  requireAuth,
  planGate("unlimited_messages"),
  chatController.streamQuery,
);
