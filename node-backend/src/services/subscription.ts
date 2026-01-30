import { getActiveSubscription } from "../db/queries";

export const requireActiveSubscription = async (userId: string) => {
  const subscription = await getActiveSubscription(userId);
  if (!subscription) {
    const error = new Error("Not found");
    (error as Error & { status?: number }).status = 404;
    throw error;
  }
  return subscription;
};
