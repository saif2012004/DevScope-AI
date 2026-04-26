import { Router } from "express";
import * as reposController from "../controllers/repos.controller";
import { planGate } from "../middleware/planGate";
import { requireAuth } from "../middleware/requireAuth";

export const reposRoutes = Router();

reposRoutes.get("/", requireAuth, reposController.listRepos);
reposRoutes.post(
  "/",
  requireAuth,
  planGate("unlimited_repos"),
  reposController.createRepo,
);
reposRoutes.get("/:repoId", requireAuth, reposController.getRepo);
reposRoutes.delete("/:repoId", requireAuth, reposController.deleteRepo);
