import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import type { Request } from "express";
import { HttpError } from "../errors.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getUploadDir(): string {
  return path.resolve(
    process.cwd(),
    process.env.UPLOAD_PATH || path.join(__dirname, "../../uploads/gifs"),
  );
}

export function publicGifUrl(filename: string): string {
  return `/uploads/gifs/${filename}`;
}

export function absoluteGifPath(gifUrl: string | null | undefined): string | null {
  if (!gifUrl) return null;
  const filename = path.posix.basename(String(gifUrl).replaceAll("\\", "/"));
  if (!filename || filename.includes("..") || !filename.toLowerCase().endsWith(".gif")) {
    return null;
  }
  return path.join(getUploadDir(), filename);
}

export function deleteGifFile(gifUrl: string | null | undefined): void {
  const filePath = absoluteGifPath(gifUrl);
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error("Failed to delete GIF file:", error);
  }
}

function ensureUploadDir(): void {
  fs.mkdirSync(getUploadDir(), { recursive: true });
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    ensureUploadDir();
    cb(null, getUploadDir());
  },
  filename(_req, _file, cb) {
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}.gif`);
  },
});

export const gifUpload = multer({
  storage,
  limits: {
    fileSize: Number(process.env.MAX_FILE_SIZE) || 5_242_880,
  },
  fileFilter(_req: Request, file, cb) {
    if (file.mimetype !== "image/gif") {
      cb(new HttpError("Invalid file type. Only GIF files are allowed.", 400));
      return;
    }
    cb(null, true);
  },
});
