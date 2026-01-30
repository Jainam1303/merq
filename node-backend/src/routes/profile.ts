import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { profileUpdateSchema } from "../utils/validation";
import {
  findUserByUsername,
  getActiveSubscription,
  getPlanById,
  getUserProfile,
  updateUserContact,
  updateUserPassword,
  upsertUserProfile
} from "../db/queries";
import { encryptSecret, maskSecret } from "../utils/crypto";
import { hashPassword, verifyPassword } from "../utils/password";

const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const profile = await getUserProfile(req.user!.id);
    const subscription = await getActiveSubscription(req.user!.id);
    const plan = subscription ? await getPlanById(subscription.plan_id) : null;
    const planPayload = plan
      ? {
          name: plan.name,
          price: plan.price,
          duration_days: plan.duration_days,
          start_date: subscription?.current_period_start,
          end_date: subscription?.current_period_end
        }
      : null;
    if (!profile) {
      return res.json({ profile: null, user: req.user, plan: planPayload });
    }
    return res.json({
      user: req.user,
      profile: {
        brokerName: profile.broker_name,
        apiKey: maskSecret(profile.api_key_enc),
        clientCode: maskSecret(profile.client_code_enc),
        password: maskSecret(profile.password_enc),
        totp: maskSecret(profile.totp_enc),
        backtestApiKey: maskSecret(profile.backtest_api_key_enc),
        backtestClientCode: maskSecret(profile.backtest_client_code_enc),
        backtestPassword: maskSecret(profile.backtest_password_enc),
        backtestTotp: maskSecret(profile.backtest_totp_enc),
        whatsappNumber: profile.whatsapp_number,
        callmebotApiKey: profile.callmebot_api_key,
        updatedAt: profile.updated_at
      },
      plan: planPayload
    });
  } catch (error) {
    return next(error);
  }
});

router.put("/", requireAuth, validateBody(profileUpdateSchema), async (req, res, next) => {
  try {
    if (req.body.email || req.body.phone) {
      await updateUserContact(req.user!.id, req.body.email, req.body.phone);
    }

    if (req.body.newPassword) {
      if (req.body.currentPassword && req.user?.username) {
        const fullUser = await findUserByUsername(req.user.username);
        if (fullUser) {
          const valid = await verifyPassword(req.body.currentPassword, fullUser.password_hash);
          if (!valid) {
            return res.status(400).json({ message: "Invalid password" });
          }
        }
      }
      await updateUserPassword(req.user!.id, await hashPassword(req.body.newPassword));
    }

    const existing = await getUserProfile(req.user!.id);
    const saved = await upsertUserProfile(req.user!.id, {
      broker_name: req.body.brokerName || existing?.broker_name || "angel",
      api_key_enc: req.body.apiKey
        ? encryptSecret(req.body.apiKey)
        : existing?.api_key_enc || "",
      client_code_enc: req.body.clientCode
        ? encryptSecret(req.body.clientCode)
        : existing?.client_code_enc || "",
      password_enc: req.body.password
        ? encryptSecret(req.body.password)
        : existing?.password_enc || "",
      totp_enc: req.body.totp ? encryptSecret(req.body.totp) : existing?.totp_enc || "",
      backtest_api_key_enc: req.body.backtestApiKey
        ? encryptSecret(req.body.backtestApiKey)
        : existing?.backtest_api_key_enc || null,
      backtest_client_code_enc: req.body.backtestClientCode
        ? encryptSecret(req.body.backtestClientCode)
        : existing?.backtest_client_code_enc || null,
      backtest_password_enc: req.body.backtestPassword
        ? encryptSecret(req.body.backtestPassword)
        : existing?.backtest_password_enc || null,
      backtest_totp_enc: req.body.backtestTotp
        ? encryptSecret(req.body.backtestTotp)
        : existing?.backtest_totp_enc || null,
      whatsapp_number: req.body.whatsappNumber ?? existing?.whatsapp_number ?? null,
      callmebot_api_key: req.body.callmebotApiKey ?? existing?.callmebot_api_key ?? null
    });
    return res.json({
      profile: {
        brokerName: saved.broker_name,
        updatedAt: saved.updated_at
      }
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
