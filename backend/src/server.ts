import "dotenv/config";
import fs from "node:fs";
import http from "node:http";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import { getDb } from "./config/database.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { logger } from "./middleware/logger.js";
import authRoutes from "./routes/auth.js";
import chattersRoutes from "./routes/chatters.js";
import heroesRoutes from "./routes/heroes.js";
import settingsRoutes from "./routes/settings.js";
import statsRoutes from "./routes/stats.js";
import uploadRoutes from "./routes/upload.js";
import { createSocket } from "./socket/index.js";
import {
  attachSocket,
  getEventSubStatus,
  startChatListener,
} from "./services/chatService.js";
import { restoreAuthFromDb } from "./services/twitchService.js";
import { getUploadDir } from "./config/upload.js";

const PORT = Number(process.env.PORT || 3000);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const uploadPath = getUploadDir();

fs.mkdirSync(uploadPath, { recursive: true });
getDb();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: FRONTEND_URL },
});

createSocket(io);
attachSocket(io);

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());
app.use(logger);
app.use("/uploads/gifs", express.static(uploadPath));

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    status: "ok",
    eventSub: getEventSubStatus(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/heroes", heroesRoutes);
app.use("/api/chatters", chattersRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/upload", uploadRoutes);

app.use(errorHandler);

server.listen(PORT, async () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
  const restored = await restoreAuthFromDb();
  if (restored) {
    await startChatListener();
  }
});
