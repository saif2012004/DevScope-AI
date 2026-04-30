import { Router } from "express";
import * as complexityController from "../controllers/complexity.controller";
import { planGate } from "../middleware/planGate";
import { requireAuth } from "../middleware/requireAuth";

export const complexityRoutes = Router();

complexityRoutes.post(
  "/score",
  requireAuth,
  planGate("unlimited_messages"),
  complexityController.scoreTask,
);

complexityRoutes.get(
  "/:repoId",
  requireAuth,
  complexityController.listScores,
);
