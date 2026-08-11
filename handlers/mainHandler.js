import User from "../db/User.js";
import { userState } from "../config/state.js";
import { handleAdminText, handleAdminCallback } from "./adminHandler.js";
import { handleVideoText, handleVideoCallback } from "./videoHandler.js";
import { handleTanishuvText, handleTanishuvCallback } from "./tanishuvHandler.js";
import {
  handlePremiumText,
  handlePremiumCallback,
  handleSuccessfulPayment,
} from "./premiumHandler.js";
import { forwardMessageToPartner } from "../services/matchService.js";
import { comand } from "../bot/comand.js";

export function setupMainHandlers(bot) {
  // Global bot error catching
  bot.catch((err, ctx) => {
    if (err.response && err.response.error_code === 403) return;
    console.error(`[Telegraf Error] Update: ${ctx.updateType}`, err);
  });

  // Handle Telegram Stars Pre-Checkout Query
  bot.on("pre_checkout_query", (ctx) => {
    ctx.answerPreCheckoutQuery(true).catch(console.error);
  });

  // Handle all incoming messages (text, photos, stickers, voices, payments, etc.)
  bot.on("message", async (ctx) => {
    try {
      if (!ctx.from?.id) return;

      const userId = ctx.from.id.toString();
      const text = ctx.message.text || "";

      // Handle successful Telegram Stars Payment
      if (ctx.message.successful_payment) {
        await handleSuccessfulPayment(bot, ctx);
        return;
      }

      let dbUser = await User.findOne({ telegramId: userId });
      if (!dbUser) {
        dbUser = await User.create({ telegramId: userId });
      }

      const isStopCmd =
        text === "/stop" ||
        text === "🛑 Stop" ||
        text === "Stop" ||
        text?.toLowerCase() === "stop";

      const isNextCmd =
        text === "➡️ Keyingisi" ||
        text === "Keyingisi" ||
        text?.toLowerCase() === "keyingisi";

      // If user is in real_chatting state and sends media or text (not stop/next commands)
      if (userState.get(userId) === "real_chatting" && !isStopCmd && !isNextCmd) {
        await forwardMessageToPartner(bot, ctx, userId, dbUser);
        return;
      }

      // 1. Admin Handler
      const isAdminHandled = await handleAdminText(bot, ctx, text, userId);
      if (isAdminHandled) return;

      // 2. Premium (VIP) Handler
      const isPremiumHandled = await handlePremiumText(bot, ctx, text, userId, dbUser);
      if (isPremiumHandled) return;

      // 3. Tanishuv Handler (onboarding, /stop, AI chat, search)
      const isTanishuvHandled = await handleTanishuvText(bot, ctx, text, userId, dbUser);
      if (isTanishuvHandled) return;

      // 4. Video Handler
      const isVideoHandled = await handleVideoText(ctx, text, userId);
      if (isVideoHandled) return;

      // 5. Default command handler fallback
      if (text) {
        return await comand(ctx);
      }
    } catch (err) {
      console.error("Message Handler Error:", err);
    }
  });

  // Handle callback queries
  bot.on("callback_query", async (ctx) => {
    try {
      const userId = ctx.from.id.toString();
      const data = ctx.callbackQuery.data;

      let dbUser = await User.findOne({ telegramId: userId });
      if (!dbUser) {
        dbUser = await User.create({ telegramId: userId });
      }

      // 1. Admin Callback Handler
      const isAdminHandled = await handleAdminCallback(bot, ctx, data, userId);
      if (isAdminHandled) return;

      // 2. Premium Callback Handler
      const isPremiumHandled = await handlePremiumCallback(bot, ctx, data, userId, dbUser);
      if (isPremiumHandled) return;

      // 3. Tanishuv Callback Handler
      const isTanishuvHandled = await handleTanishuvCallback(ctx, data, userId, bot);
      if (isTanishuvHandled) return;

      // 4. Video Callback Handler
      const isVideoHandled = await handleVideoCallback(ctx, data, userId);
      if (isVideoHandled) return;

      await ctx.answerCbQuery();
    } catch (err) {
      console.error("Callback Query Error:", err);
    }
  });
}
