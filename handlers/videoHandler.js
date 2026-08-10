import Kanal from "../db/Kanal.js";
import Click from "../db/click.js";
import User from "../db/User.js";
import { navbarIndex, tempUserData } from "../config/state.js";

export async function getChannelLinks() {
  const channels = await Kanal.find({ url: { $exists: true, $ne: null } });
  return channels.map((c) => {
    const url = c.url.trim();
    if (url.startsWith("@")) return `https://t.me/${url.slice(1)}`;
    if (url.startsWith("t.me/")) return `https://${url}`;
    if (!url.startsWith("http")) return `https://${url}`;
    return url;
  });
}

export function buildChannelButtons(channelLinks) {
  return channelLinks.map((url, i) => [
    { text: `🔓 ${i + 1}-Qulfni ochish (Kanal ${i + 1})`, url },
  ]);
}

export function getCaption(views = 0, minutes = "03:45", hajmi = 0) {
  return (
    `🚨 <b>SHOSHILING! Video Telegram tomonidan o'chirilishi mumkin!</b>\n\n` +
    `🎬 <b>Nomi:</b> Exclusive HD Video\n` +
    `👁 <b>Ko'rganlar:</b> ${views.toLocaleString()} kishi\n` +
    `⏱ <b>Davomiyligi:</b> ${minutes} min\n` +
    `💾 <b>Sifati:</b> FULL HD (${hajmi} MB)\n\n` +
    `👇 <b>VIDEONI BEPUL KO'RISH UCHUN:</b>\n` +
    `Homiy kanallarga a'zo bo'ling va <b>"▶️ VIDEONI KO'RISH 🔓"</b> tugmasini bosing!`
  );
}

export async function incrementViews(id) {
  return await Kanal.findByIdAndUpdate(
    id,
    { $inc: { views: 1 } },
    { returnDocument: "after" }
  );
}

export async function sendSubscriptionChannels(ctx) {
  const channelLinks = await getChannelLinks();
  const channelButtons = buildChannelButtons(channelLinks);

  return ctx.reply(
    `🔒 **Suhbat limitiga yetdingiz yoki aloqa vaqtincha band!**\n\n` +
      `Suhbatni cheksiz va uzluksiz davom ettirish uchun quyidagi homiy kanallarga a'zo bo'ling va taqiqni yeching!`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          ...channelButtons,
          [
            {
              text: "▶️ SUHBATNI DAVOM ETTIRISH 🔓",
              callback_data: "check_chat_sub",
            },
          ],
        ],
      },
    }
  );
}

export async function handleVideoText(ctx, text, userId) {
  if (text === "🔞 Uzbekcha Video") {
    const pics = await Kanal.aggregate([{ $match: { turi: "uzbek" } }]);
    const channelLinks = await getChannelLinks();
    if (!pics.length) return ctx.reply("😔 Hozircha uzbekcha video yo'q.");

    const pic = pics[Math.floor(Math.random() * pics.length)];
    const updatedPic = await incrementViews(pic._id);
    const channelButtons = buildChannelButtons(channelLinks);

    await ctx.replyWithPhoto(pic.imgurl, {
      caption: getCaption(
        updatedPic?.views || pic.views || 0,
        pic.minutes || "03:45",
        pic.hajmi || 10.0
      ),
      protect_content: true,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          ...channelButtons,
          [{ text: "▶️ VIDEONI KO'RISH 🔓", callback_data: "check_sub" }],
        ],
      },
    });
    return true;
  }

  if (text === "🔞 Ruscha Video (top)") {
    const pics = await Kanal.aggregate([{ $match: { turi: "rus" } }]);
    const channelLinks = await getChannelLinks();
    if (!pics.length) return ctx.reply("😔 Hozircha ruscha video yo'q.");

    const pic = pics[Math.floor(Math.random() * pics.length)];
    const updatedPic = await incrementViews(pic._id);
    const channelButtons = buildChannelButtons(channelLinks);

    await ctx.replyWithPhoto(pic.imgurl, {
      caption: getCaption(
        updatedPic?.views || pic.views || 0,
        pic.minutes || "04:15",
        pic.hajmi || 12.5
      ),
      protect_content: true,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          ...channelButtons,
          [{ text: "▶️ VIDEONI KO'RISH 🔓", callback_data: "check_sub" }],
        ],
      },
    });
    return true;
  }

  if (text === "Barchasini ko'rish 💦") {
    const pics = await Kanal.aggregate([
      { $match: { turi: "boshqa" } },
      { $sample: { size: 1 } },
    ]);
    const channelLinks = await getChannelLinks();
    if (!pics.length) return ctx.reply("😔 Hozircha video yo'q.");

    navbarIndex.set(userId, 0);

    const pic = pics[0];
    const updatedPic = await incrementViews(pic._id);
    const channelButtons = buildChannelButtons(channelLinks);

    await ctx.replyWithPhoto(pic.imgurl, {
      caption: `${getCaption(updatedPic?.views || pic.views || 0, pic.minutes || "03:10", pic.hajmi || 8.5)}\n\n🗂 <b>1/${pics.length}</b>`,
      parse_mode: "HTML",
      protect_content: true,
      reply_markup: {
        inline_keyboard: [
          ...channelButtons,
          [{ text: "▶️ VIDEONI KO'RISH 🔓", callback_data: "check_sub" }],
          [{ text: "➡️ Keyingi", callback_data: "navbar_next" }],
        ],
      },
    });
    return true;
  }

  return false;
}

export async function handleVideoCallback(ctx, data, userId) {
  if (data === "check_chat_sub") {
    let attempts = tempUserData.get(`sub_clicks_${userId}`) || 0;
    attempts++;
    tempUserData.set(`sub_clicks_${userId}`, attempts);

    if (attempts < 3) {
      return await ctx.answerCbQuery(
        `Siz hali bot bergan kanallarga to'liq qo'shilmadingiz yoki qo'shilib Готово, проверить ✅ tugmasini bosmadingiz. Videoni to'liq ko'rish uchun bot bergan barcha kanallarga qo'shiling❗`,
        { show_alert: true }
      );
    }

    tempUserData.delete(`sub_clicks_${userId}`);

    await User.findOneAndUpdate(
      { telegramId: userId },
      { $set: { chatCount: 0 } }
    );

    await ctx.answerCbQuery("✅ Qulf yechildi! Suhbat davom etadi.", {
      show_alert: true,
    });

    setTimeout(
      async () => {
        await User.findOneAndUpdate(
          { telegramId: userId },
          { $set: { chatCount: 5 } }
        );
      },
      20 * 60 * 1000
    );

    return ctx.editMessageText(
      `🔓 **Taqiq yechildi!** Suhbatni bemalol davom ettirishingiz mumkin. Yozing...`,
      { parse_mode: "Markdown" }
    );
  }

  if (data === "check_sub") {
    await Click.findOneAndUpdate(
      {},
      { $inc: { clicks: 1 } },
      { upsert: true, new: true }
    );
    return await ctx.answerCbQuery(
      "Siz hali bot bergan kanallarga to'liq qo'shilmadingiz yoki qo'shilib Готово, проверить ✅ tugmasini bosmadingiz. Videoni to'liq ko'rish uchun bot bergan barcha kanallarga qo'shiling",
      { show_alert: true }
    );
  }

  if (data === "navbar_next") {
    const pics = await Kanal.aggregate([
      { $match: { turi: "boshqa" } },
      { $sample: { size: 1 } },
    ]);
    const allPics = await Kanal.find({ turi: "boshqa" });
    const channelLinks = await getChannelLinks();
    if (!pics.length) return await ctx.answerCbQuery("😔 Video yo'q.");

    const currentIndex = navbarIndex.get(userId) ?? 0;
    const newIndex = (currentIndex + 1) % pics.length;
    navbarIndex.set(userId, newIndex);

    const pic = pics[newIndex];
    const updatedPic = await incrementViews(pic._id);
    const channelButtons = buildChannelButtons(channelLinks);

    await ctx.answerCbQuery();
    return ctx.editMessageMedia(
      {
        type: "photo",
        media: pic.imgurl,
        protect_content: true,
        caption: `${getCaption(updatedPic?.views || pic.views || 0, pic.minutes || "03:10", pic.hajmi || 8.5)}\n\n🗂 <b>${newIndex + 1}/${allPics.length}</b>`,
        parse_mode: "HTML",
      },
      {
        reply_markup: {
          inline_keyboard: [
            ...channelButtons,
            [{ text: "▶️ VIDEONI KO'RISH 🔓", callback_data: "check_sub" }],
            [{ text: "➡️ Keyingi", callback_data: "navbar_next" }],
          ],
        },
      }
    );
  }

  return false;
}
