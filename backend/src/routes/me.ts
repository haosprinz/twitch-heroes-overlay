import { Router } from "express";
import {
  requireExtensionViewer,
  type ExtensionAuthedRequest,
} from "../middleware/extensionAuth.js";
import { serializeHero } from "../models/Hero.js";
import { emitHeroChange } from "../services/chatService.js";
import { emitHeroSaved } from "../services/heroEvents.js";
import {
  appearanceFromBody,
  ensureChatterByTwitchId,
  ensurePersonalHero,
  findPersonalHeroByTwitchId,
  updatePersonalHero,
} from "../services/heroFactory.js";
import { serializeChatter } from "../services/heroAssignment.js";
import { lookupTwitchUser } from "../services/twitchService.js";

const router = Router();

function headerValue(req: ExtensionAuthedRequest, name: string): string {
  const raw = req.headers[name];
  if (Array.isArray(raw)) return String(raw[0] ?? "");
  return raw == null ? "" : String(raw);
}

async function resolveViewer(req: ExtensionAuthedRequest) {
  const viewer = req.extensionViewer;
  if (!viewer) {
    throw new Error("Missing extension viewer");
  }
  const helix = await lookupTwitchUser(viewer.twitchId);
  const chatter = ensureChatterByTwitchId({
    twitchId: viewer.twitchId,
    username:
      headerValue(req, "x-dev-user-login") ||
      headerValue(req, "x-twitch-user-login") ||
      helix?.username,
    displayName:
      headerValue(req, "x-dev-display-name") ||
      headerValue(req, "x-twitch-display-name") ||
      helix?.displayName,
    profileImageUrl: helix?.profileImageUrl,
  });
  return { viewer, chatter };
}

function heroPayload(
  viewer: NonNullable<ExtensionAuthedRequest["extensionViewer"]>,
  chatter: ReturnType<typeof serializeChatter>,
  hero: ReturnType<typeof serializeHero>,
) {
  return {
    success: true as const,
    viewer: {
      twitchId: viewer.twitchId,
      role: viewer.role,
      source: viewer.source,
    },
    chatter,
    hero,
  };
}

router.get("/hero", requireExtensionViewer, async (req, res, next) => {
  try {
    const viewer = (req as ExtensionAuthedRequest).extensionViewer;
    if (!viewer) {
      throw new Error("Missing extension viewer");
    }
    const found = findPersonalHeroByTwitchId(viewer.twitchId);
    if (!found) {
      res.status(404).json({
        success: false,
        error: "hero_not_found",
        message: "Герой ещё не создан",
      });
      return;
    }
    res.json(heroPayload(viewer, serializeChatter(found.chatter), serializeHero(found.hero)));
  } catch (error) {
    next(error);
  }
});

router.post("/hero", requireExtensionViewer, async (req, res, next) => {
  try {
    const { viewer, chatter } = await resolveViewer(req as ExtensionAuthedRequest);
    const result = ensurePersonalHero(chatter);
    if (result.created) {
      emitHeroSaved(result.hero, true);
      emitHeroChange(result.chatter, result.hero);
    }
    res.status(result.created ? 201 : 200).json(
      heroPayload(viewer, serializeChatter(result.chatter), serializeHero(result.hero)),
    );
  } catch (error) {
    next(error);
  }
});

router.patch("/hero", requireExtensionViewer, async (req, res, next) => {
  try {
    const viewer = (req as ExtensionAuthedRequest).extensionViewer;
    if (!viewer) {
      throw new Error("Missing extension viewer");
    }
    const existing = findPersonalHeroByTwitchId(viewer.twitchId);
    if (!existing) {
      res.status(404).json({
        success: false,
        error: "hero_not_found",
        message: "Сначала создайте героя",
      });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const result = updatePersonalHero(
      existing.chatter,
      appearanceFromBody(body, existing.chatter.display_name || existing.chatter.username),
    );
    const mapped = emitHeroSaved(result.hero, result.created);
    emitHeroChange(result.chatter, result.hero);
    res.json(heroPayload(viewer, serializeChatter(result.chatter), mapped));
  } catch (error) {
    next(error);
  }
});

export default router;
