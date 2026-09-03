import { Router } from "express";
import { getStatsSnapshot } from "../services/statsService.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    success: true,
    stats: getStatsSnapshot(),
  });
});

export default router;
