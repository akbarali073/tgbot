import User from "../db/User.js";
import { userState } from "../config/state.js";
import { handleAdminText, handleAdminCallback } from "./adminHandler.js";
import { handleVideoText, handleVideoCallback } from "./videoHandler.js";
import { handleTanishuvText, handleTanishuvCallback } from "./tanishuvHandler.js";
import { forwardMessageToPartner } from "../services/matchService.js";
import { comand } from "../bot/comand.js";

export function setupMainHandlers(bot) {
  // Global bot error catching
  bot.catch((err, ctx) => {
    if (err.response && err.response.error_code === 403) return;
    console.error(`[Telegraf Error] Update: ${ctx.updateType}`, err);
  });

  // Handle all incoming messages (text, photos, stickers, voices, etc.)
  bot.on("message", async (ctx) => {
    try {
      if (!ctx.from?.id) return;

      const userId = ctx.from.id.toString();
      const text = ctx.message.text || "";

      let dbUser = await User.findOne({ telegramId: userId });
      if (!dbUser) {
        dbUser = await User.create({ telegramId: userId });
      }

      // If user is in real_chatting state and sends media or text (not /stop)
      if (userState.get(userId) === "real_chatting" && text !== "/stop") {
        await forwardMessageToPartner(bot, ctx, userId);
        return;
      }

      // 1. Admin Handler
      const isAdminHandled = await handleAdminText(bot, ctx, text, userId);
      if (isAdminHandled) return;

      // 2. Tanishuv Handler (onboarding, /stop, AI chat, search)
      const isTanishuvHandled = await handleTanishuvText(bot, ctx, text, userId, dbUser);
      if (isTanishuvHandled) return;

      // 3. Video Handler
      const isVideoHandled = await handleVideoText(ctx, text, userId);
      if (isVideoHandled) return;

      // 4. Default command handler fallback
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

      // 1. Admin Callback Handler
      const isAdminHandled = await handleAdminCallback(bot, ctx, data, userId);
      if (isAdminHandled) return;

      // 2. Tanishuv Callback Handler
      const isTanishuvHandled = await handleTanishuvCallback(ctx, data, userId);
      if (isTanishuvHandled) return;

      // 3. Video Callback Handler
      const isVideoHandled = await handleVideoCallback(ctx, data, userId);
      if (isVideoHandled) return;

      await ctx.answerCbQuery();
    } catch (err) {
      console.error("Callback Query Error:", err);
    }
  });
}
