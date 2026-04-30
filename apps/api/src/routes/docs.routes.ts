import { Router } from "express";
import * as docsController from "../controllers/docs.controller";
import { requireAuth } from "../middleware/requireAuth";

export const docsRoutes = Router();

docsRoutes.post("/generate", requireAuth, docsController.generateDoc);
docsRoutes.get("/:repoId/download", requireAuth, docsController.downloadDoc);
docsRoutes.get("/:repoId", requireAuth, docsController.getDoc);
