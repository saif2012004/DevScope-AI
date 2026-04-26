import { Router } from "express";
import * as billingController from "../controllers/billing.controller";
import { requireAuth } from "../middleware/requireAuth";

export const billingRoutes = Router();

billingRoutes.post(
  "/create-checkout-session",
  requireAuth,
  billingController.createCheckoutSession,
);
billingRoutes.post(
  "/create-portal-session",
  requireAuth,
  billingController.createPortalSession,
);
billingRoutes.get(
  "/subscription-status",
  requireAuth,
  billingController.subscriptionStatus,
);
