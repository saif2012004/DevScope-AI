import { Router } from "express";
import * as prReviewController from "../controllers/prReview.controller";
import { planGate } from "../middleware/planGate";
import { requireAuth } from "../middleware/requireAuth";

export const prReviewRoutes = Router();

prReviewRoutes.post(
  "/analyze",
  requireAuth,
  planGate("unlimited_messages"),
  prReviewController.analyzePR,
);

prReviewRoutes.get(
  "/:repoId",
  requireAuth,
  prReviewController.listReviews,
);
