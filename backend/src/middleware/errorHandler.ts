import type { ErrorRequestHandler } from "express";
import { getErrorCode, getErrorMessage, getErrorStatus } from "../errors.js";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  if (getErrorCode(err) === "LIMIT_FILE_SIZE") {
    res.status(400).json({
      success: false,
      error: "File too large. Maximum size is 5MB.",
    });
    return;
  }
  const status = getErrorStatus(err);
  res.status(status).json({
    success: false,
    error: getErrorMessage(err),
  });
};
