import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";

export const validateBody =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body === undefined || req.body === null ? {} : req.body;
      req.body = schema.parse(body);
      return next();
    } catch (error) {
      return res.status(400).json({ message: "Invalid request body" });
    }
  };
