import crypto from "crypto";
import { env } from "../config/env";

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  status: string;
};

export const createRazorpayOrder = async (amount: number, currency = "INR") => {
  const credentials = Buffer.from(
    `${env.razorpay.keyId}:${env.razorpay.keySecret}`
  ).toString("base64");

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`
    },
    body: JSON.stringify({
      amount,
      currency,
      payment_capture: 1
    })
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(text || "Razorpay order creation failed");
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  return (await response.json()) as RazorpayOrder;
};

export const verifyRazorpaySignature = (
  orderId: string,
  paymentId: string,
  signature: string
) => {
  const payload = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac("sha256", env.razorpay.keySecret)
    .update(payload)
    .digest("hex");

  if (expected !== signature) {
    const error = new Error("Invalid Razorpay signature");
    (error as Error & { status?: number }).status = 400;
    throw error;
  }
};
