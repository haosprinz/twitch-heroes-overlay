import { Router } from "express";
import { gifUpload, publicGifUrl } from "../config/upload.js";

const router = Router();

router.post("/gif", gifUpload.single("file"), (req, res) => {
  if (!req.file) {
    res.status(400).json({
      success: false,
      error: "Invalid file type. Only GIF files are allowed.",
    });
    return;
  }
  res.json({
    success: true,
    url: publicGifUrl(req.file.filename),
  });
});

export default router;
