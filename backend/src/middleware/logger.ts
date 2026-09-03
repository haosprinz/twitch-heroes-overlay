import type { RequestHandler } from "express";

export const logger: RequestHandler = (req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
};
