import { z } from "zod";

export const loginSchema = z
  .object({
    username: z.string().min(3),
    password: z.string().min(8)
  })
  .strict();

export const registerSchema = z
  .object({
    username: z.string().min(3),
    password: z.string().min(8)
  })
  .strict();

export const refreshSchema = z
  .object({
    refreshToken: z.string().min(20).optional()
  })
  .strict();

export const paymentCreateSchema = z
  .object({
    planId: z.string().min(1)
  })
  .strict();

export const paymentVerifySchema = z
  .object({
    orderId: z.string().min(1),
    paymentId: z.string().min(1),
    signature: z.string().min(10),
    planId: z.string().min(1).optional()
  })
  .strict();

export const profileUpdateSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().min(6).optional(),
    brokerName: z.string().min(2).optional(),
    apiKey: z.string().min(4).optional(),
    clientCode: z.string().min(4).optional(),
    password: z.string().min(6).optional(),
    totp: z.string().min(6).optional(),
    backtestApiKey: z.string().min(4).optional(),
    backtestClientCode: z.string().min(4).optional(),
    backtestPassword: z.string().min(4).optional(),
    backtestTotp: z.string().min(4).optional(),
    whatsappNumber: z.string().min(6).optional(),
    callmebotApiKey: z.string().min(4).optional(),
    newPassword: z.string().min(6).optional(),
    currentPassword: z.string().min(6).optional()
  })
  .strict();

export const logoutSchema = z
  .object({
    refreshToken: z.string().min(20).optional()
  })
  .strict();

export const startSchema = z
  .object({
    symbols: z.array(z.string()).optional(),
    interval: z.string().optional(),
    startTime: z.string().optional(),
    stopTime: z.string().optional(),
    capital: z.union([z.string(), z.number()]).optional(),
    simulated: z.boolean().optional(),
    strategy: z.string().optional()
  })
  .strict();

export const backtestSchema = z
  .object({
    strategy: z.string().optional(),
    symbols: z.array(z.string()).optional(),
    interval: z.string().optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional()
  })
  .strict();

export const testOrderSchema = z
  .object({
    symbol: z.string().min(1),
    quantity: z.union([z.number(), z.string()]),
    sl: z.union([z.number(), z.string()]).optional(),
    tp: z.union([z.number(), z.string()]).optional(),
    mode: z.enum(["BUY", "SELL"]).optional()
  })
  .strict();

export const tradeActionSchema = z
  .object({
    trade_id: z.string().min(1)
  })
  .strict();

export const updateTradeSchema = z
  .object({
    trade_id: z.string().min(1),
    sl: z.union([z.number(), z.string()]),
    tp: z.union([z.number(), z.string()])
  })
  .strict();

export const deleteOrdersSchema = z
  .object({
    order_ids: z.array(z.string().min(1))
  })
  .strict();

export const assignPlanSchema = z
  .object({
    plan_id: z.string().min(1),
    days: z.number().int().min(1)
  })
  .strict();

export const createPlanSchema = z
  .object({
    name: z.string().min(2),
    price: z.number().min(0),
    duration: z.number().int().min(1),
    features: z.array(z.string()).optional()
  })
  .strict();

