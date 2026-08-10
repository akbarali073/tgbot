import { adminState } from "../config/state.js";

export function callbackHandler(bot) {
  bot.on("callback_query", async (ctx, next) => {
    const data = ctx.callbackQuery.data;
    const userId = ctx.from.id.toString();

    if (data === "cancel") {
      adminState.delete(userId);
      await ctx.answerCbQuery("Bekor qilindi ❌");
      return await ctx.editMessageText("❌ Kanal qo‘shish bekor qilindi");
    }
  });
}
