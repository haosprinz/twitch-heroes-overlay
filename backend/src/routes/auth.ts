import { Router } from "express";
import type { Response } from "express";
import { getErrorMessage } from "../errors.js";
import { startChatListener } from "../services/chatService.js";
import {
  getAuthorizationUrl,
  handleOAuthCallback,
} from "../services/twitchService.js";

const router = Router();

function firstQuery(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? "");
  return value == null ? "" : String(value);
}

function frontendUrl(): string {
  return process.env.FRONTEND_URL || "http://localhost:5173";
}

function redirectHome(res: Response, params: Record<string, string>): void {
  const url = new URL(frontendUrl());
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  res.redirect(url.toString());
}

router.get("/twitch", (_req, res, next) => {
  try {
    res.redirect(getAuthorizationUrl());
  } catch (error) {
    next(error);
  }
});

router.get("/twitch/callback", async (req, res) => {
  const twitchError = firstQuery(req.query.error);
  if (twitchError) {
    const description = firstQuery(req.query.error_description) || twitchError;
    redirectHome(res, { auth: "error", message: description });
    return;
  }

  try {
    await handleOAuthCallback(
      firstQuery(req.query.code),
      firstQuery(req.query.state),
    );
    await startChatListener();
    redirectHome(res, { auth: "success" });
  } catch (error) {
    console.error("Twitch OAuth callback failed:", error);
    redirectHome(res, {
      auth: "error",
      message: getErrorMessage(error, "Twitch authorization failed"),
    });
  }
});

export default router;
