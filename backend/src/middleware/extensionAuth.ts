import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { getTwitchConfig } from "../config/twitch.js";

export type ExtensionViewer = {
  twitchId: string;
  opaqueUserId: string;
  channelId: string;
  role: string;
  source: "jwt" | "dev";
};

export type ExtensionAuthedRequest = Request & {
  extensionViewer?: ExtensionViewer;
};

type ExtensionJwtPayload = {
  user_id?: string;
  opaque_user_id?: string;
  channel_id?: string;
  role?: string;
  is_unlinked?: boolean;
};

function headerValue(req: Request, name: string): string {
  const raw = req.headers[name.toLowerCase()];
  if (Array.isArray(raw)) return String(raw[0] ?? "");
  return raw == null ? "" : String(raw);
}

function bearerToken(req: Request): string {
  const header = headerValue(req, "authorization");
  if (header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }
  return headerValue(req, "x-extension-jwt").trim();
}

function sendError(res: Response, status: number, error: string, extra: Record<string, unknown> = {}): void {
  res.status(status).json({ success: false, error, ...extra });
}

export function requireExtensionViewer(req: Request, res: Response, next: NextFunction): void {
  const { extensionSecret, extensionDevBypass } = getTwitchConfig();
  const token = bearerToken(req);

  if (!token) {
    if (!extensionSecret && !extensionDevBypass) {
      sendError(
        res,
        503,
        "extension_not_configured",
        { message: "Задайте TWITCH_EXTENSION_SECRET в backend/.env" },
      );
      return;
    }
    sendError(res, 401, "missing_token");
    return;
  }

  if (extensionDevBypass && (token === "dev" || token.startsWith("dev:"))) {
    const twitchId =
      token.startsWith("dev:") && token.length > 4
        ? token.slice(4)
        : headerValue(req, "x-dev-user-id") || headerValue(req, "x-twitch-user-id");
    if (!twitchId) {
      sendError(res, 401, "identity_required", {
        message: "Для локального предпросмотра укажите X-Dev-User-Id",
      });
      return;
    }
    (req as ExtensionAuthedRequest).extensionViewer = {
      twitchId,
      opaqueUserId: `dev:${twitchId}`,
      channelId: headerValue(req, "x-dev-channel-id") || "local",
      role: "viewer",
      source: "dev",
    };
    next();
    return;
  }

  if (!extensionSecret) {
    sendError(
      res,
      503,
      "extension_not_configured",
      { message: "Задайте TWITCH_EXTENSION_SECRET в backend/.env" },
    );
    return;
  }

  try {
    const payload = jwt.verify(token, Buffer.from(extensionSecret, "base64")) as ExtensionJwtPayload;
    const twitchId = payload.user_id;
    if (!twitchId || payload.is_unlinked) {
      sendError(res, 403, "identity_required", {
        message: "Разрешите расширению видеть ваш Twitch ID",
      });
      return;
    }
    (req as ExtensionAuthedRequest).extensionViewer = {
      twitchId,
      opaqueUserId: payload.opaque_user_id || "",
      channelId: payload.channel_id || "",
      role: payload.role || "viewer",
      source: "jwt",
    };
    next();
  } catch {
    sendError(res, 401, "invalid_token");
  }
}
