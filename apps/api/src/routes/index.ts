import { Router } from "express";
import { authRoutes } from "./auth.routes";
import { billingRoutes } from "./billing.routes";
import { chatRoutes } from "./chat.routes";
import { reposRoutes } from "./repos.routes";

export const routes = Router();

routes.use("/auth", authRoutes);
routes.use("/repos", reposRoutes);
routes.use("/billing", billingRoutes);
routes.use("/chat", chatRoutes);
