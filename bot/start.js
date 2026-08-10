import User from "../db/User.js";
import dotenv from "dotenv";
import { adminKeyboard, userKeyboard } from "../keyboard/keyboard.js";

dotenv.config();

const ADMIN_ID = process.env.ADMIN_ID;

export async function startHandler(ctx) {
  const user = await User.findOne({ telegramId: ctx.from.id });

  if (!user) {
    const newUser = new User({
      telegramId: ctx.from.id,
      username: ctx.from.username,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name,
    });
    await newUser.save();
  }

  if (ctx.from.id.toString() === ADMIN_ID) {
    return ctx.reply(
      `Assalomu alaykum, admin! Botimizga xush kelibsiz.`,
      adminKeyboard,
    );
  }

  await ctx.reply(
    `<b>Salom ${ctx.from.first_name}👋! Botimizga xush kelibsiz</b>.\n\n🚀 Pastdagi menyu orqali o'zingizga kerakli videolar tomosha qiling.\n\n`,
    {
      parse_mode: "HTML",
      ...userKeyboard,
    },
  );
}
