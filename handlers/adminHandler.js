import dotenv from "dotenv";
import User from "../db/User.js";
import Kanal from "../db/Kanal.js";
import Click from "../db/click.js";
import { adminState, tempData } from "../config/state.js";

dotenv.config();

const ADMIN_ID = process.env.ADMIN_ID;

export async function buildDeleteChannelButtons() {
  const channels = await Kanal.find({ url: { $exists: true, $ne: null } });
  if (!channels.length) return null;

  return channels.map((c, i) => [
    {
      text: `❌ ${i + 1} - ${c.url}`,
      callback_data: `del_channel_${c._id}`,
    },
  ]);
}

export async function handleAdminText(bot, ctx, text, userId) {
  if (userId !== ADMIN_ID) return false;

  const state = adminState.get(userId);

  if (state === "add_channel") {
    await Kanal.create({ url: text });
    adminState.delete(userId);
    await ctx.reply("✅ Kanal muvaffaqiyatli qo'shildi!");
    return true;
  }

  if (state === "send_message") {
    adminState.delete(userId);
    ctx.reply("⏳ Xabar yuborish boshlandi...");

    const users = await User.find({});
    let success = 0;
    let blockedCount = 0;

    for (const u of users) {
      if (!u.telegramId) continue;
      try {
        await bot.telegram.sendMessage(u.telegramId, text);
        success++;
        await new Promise((res) => setTimeout(res, 40));
      } catch (err) {
        if (err.response && err.response.error_code === 403) {
          blockedCount++;
        }
      }
    }

    await ctx.reply(
      `✅ <b>Xabar yuborish yakunlandi!</b>\n\n` +
        `📥 Muvaffaqiyatli: ${success} ta\n` +
        `🚫 Bloklaganlar: ${blockedCount} ta`,
      { parse_mode: "HTML" }
    );
    return true;
  }

  if (state === "add_linkpic") {
    const bazaLink = await Kanal.findOne({ imgurl: text });
    if (bazaLink) {
      await ctx.reply("⚠️ Bu link allaqachon mavjud.");
      return true;
    }

    let testMsg;
    try {
      testMsg = await ctx.replyWithPhoto(text, {
        caption: "🔍 Tekshirilmoqda...",
        protect_content: true,
      });
    } catch (e) {
      await ctx.reply("❌ Rasm qabul qilinmadi. To'g'ri link yuboring:");
      return true;
    }

    try {
      await ctx.deleteMessage(testMsg.message_id);
    } catch (_) {}

    tempData.set(userId, { imgurl: text });
    adminState.set(userId, "choose_tur");

    await ctx.reply("✅ Rasm tayyor! Bo'limni tanlang:", {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🇺🇿 Uzbek", callback_data: "tur_uzbek" },
            { text: "🇷🇺 Rus", callback_data: "tur_rus" },
          ],
          [{ text: "🌐 Boshqa", callback_data: "tur_boshqa" }],
          [
            {
              text: "❌ Bekor qilish",
              callback_data: "cancel_add_linkpic",
            },
          ],
        ],
      },
    });
    return true;
  }

  if (text === "📊 Statistika") {
    const usersCount = await User.countDocuments();
    const channelsCount = await Kanal.countDocuments({
      url: { $exists: true, $ne: null },
    });
    const rasmsCount = await Kanal.countDocuments({
      imgurl: { $exists: true, $ne: null },
    });
    const totalClicks = await Click.findOne({
      clicks: { $exists: true, $ne: null },
    });

    await ctx.reply(
      `📊 <b>Statistika</b>\n\n` +
        `👥 Foydalanuvchilar: ${usersCount}\n` +
        `📢 Kanallar: ${channelsCount}\n` +
        `🖼 Rasmlar: ${rasmsCount}\n\n` +
        `📊 Clicks: ${totalClicks?.clicks || 0}`,
      { parse_mode: "HTML" }
    );
    return true;
  }

  if (text === "📢 Kanal qo'shish") {
    adminState.set(userId, "add_channel");
    await ctx.reply("📢 Kanal linkini yuboring:");
    return true;
  }

  if (text === "➖ Kanal uzish") {
    const buttons = await buildDeleteChannelButtons();
    if (!buttons) {
      await ctx.reply("😔 Hozircha kanal yo'q.");
      return true;
    }

    await ctx.reply("🗑 O'chirmoqchi bo'lgan kanalni tanlang:", {
      reply_markup: {
        inline_keyboard: [
          ...buttons,
          [
            {
              text: "❌ Bekor qilish",
              callback_data: "cancel_delete_channel",
            },
          ],
        ],
      },
    });
    return true;
  }

  if (text === "🔗 Rasm linki") {
    adminState.set(userId, "add_linkpic");
    await ctx.reply("🔗 Rasm linkini yuboring:");
    return true;
  }

  if (text === "📤 Habar yuborish") {
    adminState.set(userId, "send_message");
    await ctx.reply("✍️ Yubormoqchi bo'lgan xabaringizni kiriting:", {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "❌ Bekor qilish",
              callback_data: "cancel_send_message",
            },
          ],
        ],
      },
    });
    return true;
  }

  return false;
}

export async function handleAdminCallback(bot, ctx, data, userId) {
  if (data.startsWith("del_channel_")) {
    const channelId = data.replace("del_channel_", "");
    await Kanal.findByIdAndDelete(channelId);
    await ctx.answerCbQuery("✅ Kanal o'chirildi!");

    const buttons = await buildDeleteChannelButtons();
    if (!buttons) return ctx.editMessageText("✅ Boshqa kanal qolmadi.");

    return ctx.editMessageReplyMarkup({
      inline_keyboard: [
        ...buttons,
        [
          {
            text: "❌ Bekor qilish",
            callback_data: "cancel_delete_channel",
          },
        ],
      ],
    });
  }

  if (data === "cancel_delete_channel") {
    await ctx.answerCbQuery();
    return ctx.editMessageText("❌ O'chirish bekor qilindi.");
  }

  if (["tur_uzbek", "tur_rus", "tur_boshqa"].includes(data)) {
    const temp = tempData.get(userId);
    if (!temp?.imgurl)
      return await ctx.answerCbQuery("❌ Ma'lumot topilmadi.");

    const turMap = {
      tur_uzbek: "uzbek",
      tur_rus: "rus",
      tur_boshqa: "boshqa",
    };
    const randomViews = Math.floor(Math.random() * 5000) + 1000;
    const mins = Math.floor(Math.random() * (32 - 12 + 1)) + 12;
    const secs = Math.floor(Math.random() * 60);

    const randomMinutes = `${mins < 10 ? "0" + mins : mins}:${secs < 10 ? "0" + secs : secs}`;
    const randomHajmi = Number(((mins + secs / 60) * 7.5).toFixed(1));

    await Kanal.create({
      imgurl: temp.imgurl,
      turi: turMap[data],
      views: randomViews,
      minutes: randomMinutes,
      hajmi: randomHajmi,
    });

    tempData.delete(userId);
    adminState.delete(userId);

    await ctx.answerCbQuery("✅ Saqlandi!");
    return ctx.editMessageText(
      `✅ Rasm va tur (${turMap[data]}) saqlandi!\n\n` +
        `⏱ Davomiyligi: ${randomMinutes}\n` +
        `💾 Hajmi: ${randomHajmi} MB\n` +
        `👁 Ko'rishlar: ${randomViews.toLocaleString()}`
    );
  }

  if (data === "cancel_send_message") {
    adminState.delete(userId);
    await ctx.answerCbQuery();
    return ctx.editMessageText("❌ Xabar yuborish bekor qilindi.");
  }

  if (data === "cancel_add_linkpic") {
    tempData.delete(userId);
    adminState.delete(userId);
    await ctx.answerCbQuery();
    return ctx.editMessageText("❌ Rasm qo'shish bekor qilindi.");
  }

  return false;
}
