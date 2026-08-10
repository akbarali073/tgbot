import User from "../db/User.js";
import dotenv from "dotenv";
import { adminKeyboard, userKeyboard } from "../keyboard/keyboard.js";

dotenv.config();

const ADMIN_ID = process.env.ADMIN_ID;

export async function startHandler(ctx) {
  try {
    const userId = ctx.from.id.toString();
    let user = await User.findOne({ telegramId: userId });

    if (!user) {
      user = new User({
        telegramId: userId,
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
      });
      await user.save();
    }

    if (userId === ADMIN_ID) {
      return ctx.reply(
        `Assalomu alaykum, admin! Botimizga xush kelibsiz.`,
        adminKeyboard
      );
    }

    await ctx.reply(
      `<b>Salom ${ctx.from.first_name}👋! Botimizga xush kelibsiz</b>.\n\n🚀 Pastdagi menyu orqali o'zingizga kerakli bo'limni tanlang.\n\n`,
      {
        parse_mode: "HTML",
        ...userKeyboard,
      }
    );
  } catch (err) {
    console.error("Start Handler Error:", err);
  }
}
