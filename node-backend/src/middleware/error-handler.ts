import { NextFunction, Request, Response } from "express";
import { logError } from "../utils/logger";

export const errorHandler = (
  error: Error & { status?: number },
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const status = error.status || 500;
  logError("Request failed", {
    path: req.path,
    status,
    message: error.message
  });
  res.status(status).json({
    message: status === 500 ? "Internal server error" : error.message
  });
};
