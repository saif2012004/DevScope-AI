import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { requireAuth } from "../middleware/requireAuth";

export const authRoutes = Router();

authRoutes.post("/sync", requireAuth, authController.sync);
authRoutes.get("/me", requireAuth, authController.me);
authRoutes.get("/usage", requireAuth, authController.usage);
authRoutes.get("/activity", requireAuth, authController.activity);
