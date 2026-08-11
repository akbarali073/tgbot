import User from "../db/User.js";
import { userState, tempUserData, activePartner } from "../config/state.js";
import {
  getRandomPartner,
  femalePartners,
  malePartners,
} from "../config/partners.js";
import {
  getAiResponse,
  resetInactivityTimer,
  clearAiSession,
} from "../services/aiService.js";
import {
  startUserSearch,
  cancelSearch,
  stopRealChat,
  forwardMessageToPartner,
} from "../services/matchService.js";
import { sendSubscriptionChannels } from "./videoHandler.js";
import { CITIES } from "./premiumHandler.js";
import { tanishuvKeyboard, userKeyboard } from "../keyboard/keyboard.js";

export async function promptVipGenderChoice(ctx) {
  await ctx.reply(
    `👑 <b>VIP Sherik Tanlovi</b>\n\n` +
      `Tanishuvni boshlashdan oldin, qaysi jinsdagi sherik bilan tanishishni xohlaysiz?`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "👩 Qiz bola", callback_data: "tanishuv_pref_female" },
            { text: "👨 O'g'il bola", callback_data: "tanishuv_pref_male" },
          ],
          [{ text: "🌐 Farqi yo'q", callback_data: "tanishuv_pref_any" }],
        ],
      },
    },
  );
}

/**
 * Handles text input related to Tanishuv (onboarding steps, /stop, active real/AI chats).
 */
export async function handleTanishuvText(bot, ctx, text, userId, dbUser) {
  const currentState = userState.get(userId);

  const isStopCmd =
    text === "/stop" ||
    text === "🛑 Stop" ||
    text === "Stop" ||
    text?.toLowerCase() === "stop";

  const isNextCmd =
    text === "➡️ Keyingisi" ||
    text === "Keyingisi" ||
    text?.toLowerCase() === "keyingisi";

  // ==========================================
  // 1. /STOP VA KEYINGISI BUYRUQLARI
  // ==========================================
  if (isStopCmd) {
    if (currentState === "searching_partner") {
      cancelSearch(userId);
      await ctx.reply(
        "🚪 Sherik qidirish bekor qilindi. Asosiy menuga qaytdingiz.",
        userKeyboard,
      );
      return true;
    }

    if (currentState === "real_chatting") {
      const msg = await stopRealChat(bot, userId);
      await ctx.reply(msg, userKeyboard);
      return true;
    }

    if (currentState === "ai_chatting") {
      userState.delete(userId);
      activePartner.delete(userId);
      clearAiSession(userId);
      await ctx.reply(
        "🚪 Tanishuv chatidan chiqdingiz. Asosiy menuga qaytdingiz.",
        userKeyboard,
      );
      return true;
    }

    if (
      currentState === "awaiting_name" ||
      currentState === "awaiting_age" ||
      currentState === "awaiting_city"
    ) {
      userState.delete(userId);
      tempUserData.delete(userId);
      await ctx.reply(
        "🚪 Tanishuv bekor qilindi. Asosiy menuga qaytdingiz.",
        userKeyboard,
      );
      return true;
    }

    await ctx.reply(
      "ℹ️ Hozirda aktiv tanishuv chati yoki qidiruv yo'q.",
      userKeyboard,
    );
    return true;
  }

  if (isNextCmd) {
    if (currentState === "searching_partner") {
      cancelSearch(userId);
    } else if (currentState === "real_chatting") {
      await stopRealChat(bot, userId);
    } else if (currentState === "ai_chatting") {
      userState.delete(userId);
      activePartner.delete(userId);
      clearAiSession(userId);
    } else if (
      currentState === "awaiting_name" ||
      currentState === "awaiting_age" ||
      currentState === "awaiting_city"
    ) {
      userState.delete(userId);
      tempUserData.delete(userId);
    }

    if (!dbUser.gender) {
      await ctx.reply(
        "✨ Tanishuv bo'limiga xush kelibsiz!\n\nIltimos, avval jinsingizni tanlang:",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "👨 Erkak", callback_data: "gender_male" }],
              [{ text: "👩 Qiz bola", callback_data: "gender_female" }],
            ],
          },
        },
      );
      return true;
    }

    if (!dbUser.name || !dbUser.age) {
      userState.set(userId, "awaiting_name");
      await ctx.reply("📝 Ismingizni kiriting:");
      return true;
    }

    if (dbUser.hasActivePremium()) {
      await promptVipGenderChoice(ctx);
      return true;
    }

    await ctx.reply("🔄 Keyingi sherik qidirilmoqda...", tanishuvKeyboard);
    await startUserSearch(bot, ctx, dbUser);
    return true;
  }

  // ==========================================
  // 2. ISM, YOSH VA VILOYATNI OLISH BOSQICHLARI
  // ==========================================
  if (currentState === "awaiting_name") {
    tempUserData.set(userId, { name: text });
    userState.set(userId, "awaiting_age");
    await ctx.reply(
      `Ajoyib, **${text}**! Endi yoshingizni kiriting (Masalan: 20):`,
      { parse_mode: "Markdown" },
    );
    return true;
  }

  if (currentState === "awaiting_age") {
    const age = parseInt(text);
    if (isNaN(age) || age < 10 || age > 90) {
      await ctx.reply(
        "⚠️ Iltimos, yoshingizni to'g'ri raqamda kiriting (Masalan: 20):",
      );
      return true;
    }

    const temp = tempUserData.get(userId) || {};
    temp.age = age;
    tempUserData.set(userId, temp);

    userState.set(userId, "awaiting_city");

    const cityButtons = CITIES.map((c) => [
      { text: `📍 ${c}`, callback_data: `onboard_city_${c}` },
    ]);

    await ctx.reply(`Ajoyib! Endi yashaydigan viloyatingizni tanlang:`, {
      reply_markup: {
        inline_keyboard: cityButtons,
      },
    });
    return true;
  }

  // ==========================================
  // 3. TANISHUV BO'LIMI TUGMASI ("💬 Tanishuv" / "🔥 Tanishuv")
  // ==========================================
  if (text === "💬 Tanishuv" || text === "🔥 Tanishuv") {
    if (!dbUser.gender) {
      await ctx.reply(
        "✨ Tanishuv bo'limiga xush kelibsiz!\n\nIltimos, avval jinsingizni tanlang:",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "👨 Erkak", callback_data: "gender_male" }],
              [{ text: "👩 Qiz bola", callback_data: "gender_female" }],
            ],
          },
        },
      );
      return true;
    }

    if (!dbUser.name || !dbUser.age) {
      userState.set(userId, "awaiting_name");
      await ctx.reply("📝 Ismingizni kiriting:");
      return true;
    }

    if (currentState === "searching_partner") {
      await ctx.reply(
        "🔎 Siz allaqachon real sherik qidiryapsiz. Kuting...\n\n❌ Qidiruvni bekor qilish uchun 🛑 Stop bosing.",
        tanishuvKeyboard,
      );
      return true;
    }

    if (currentState === "real_chatting") {
      await ctx.reply(
        "💬 Siz allaqachon real foydalanuvchi bilan suhbatdasiz.\n\n❌ Suhbatni yakunlash uchun 🛑 Stop, keyingisiga o'tish uchun ➡️ Keyingisi bosing.",
        tanishuvKeyboard,
      );
      return true;
    }

    if (currentState === "ai_chatting") {
      await ctx.reply(
        "🤖 Siz allaqachon AI hamrohingiz bilan suhbatdasiz.\n\n❌ Suhbatdan chiqish uchun 🛑 Stop, keyingisiga o'tish uchun ➡️ Keyingisi bosing.",
        tanishuvKeyboard,
      );
      return true;
    }

    if (dbUser.hasActivePremium()) {
      await promptVipGenderChoice(ctx);
      return true;
    }

    // Sherik qidiruvni boshlaymiz
    await startUserSearch(bot, ctx, dbUser);
    return true;
  }

  // ==========================================
  // 4. REAL FOYDALANUVCHILAR CHATI
  // ==========================================
  if (currentState === "real_chatting") {
    await forwardMessageToPartner(bot, ctx, userId, dbUser);
    return true;
  }

  // ==========================================
  // 5. AI CHAT
  // ==========================================
  if (currentState === "ai_chatting") {
    // Premium a'zolar uchun limit yo'q! Oddiy foydalanuvchilar uchun 5 xabar limit.
    if (!dbUser.hasActivePremium() && dbUser.chatCount >= 5) {
      await sendSubscriptionChannels(ctx);
      return true;
    }

    let partner = activePartner.get(userId);
    if (!partner) {
      if (dbUser.hasActivePremium() && dbUser.selectedAiPartner) {
        partner = { name: dbUser.selectedAiPartner, age: 20 };
      } else if (
        dbUser.hasActivePremium() &&
        dbUser.prefGender &&
        dbUser.prefGender !== "any"
      ) {
        const targetList =
          dbUser.prefGender === "female" ? femalePartners : malePartners;
        partner = targetList[Math.floor(Math.random() * targetList.length)];
      } else {
        partner = getRandomPartner(dbUser.gender || "male");
      }
      activePartner.set(userId, partner);
    }

    resetInactivityTimer(bot, ctx, userId, dbUser);

    // Typing simulated delay
    const delayBeforeTyping = Math.floor(Math.random() * 11) + 5; // 5..15s
    await new Promise((resolve) => setTimeout(resolve, delayBeforeTyping * 1000));

    const typingDuration = Math.floor(Math.random() * 6) + 5; // 5..10s

    await ctx.sendChatAction("typing").catch(() => {});
    const interval = setInterval(() => {
      ctx.sendChatAction("typing").catch(() => {});
    }, 4000);

    const [result] = await Promise.all([
      getAiResponse(userId, dbUser, text, partner),
      new Promise((resolve) => setTimeout(resolve, typingDuration * 1000)),
    ]);

    clearInterval(interval);

    if (!result.success) {
      await sendSubscriptionChannels(ctx);
      return true;
    }

    await ctx.reply(result.text);
    return true;
  }

  return false;
}

/**
 * Handles callback queries related to Tanishuv (gender choice, onboard city choice).
 */
export async function handleTanishuvCallback(ctx, data, userId, bot) {
  if (data === "gender_male" || data === "gender_female") {
    const selectedGender = data === "gender_male" ? "male" : "female";
    await User.findOneAndUpdate(
      { telegramId: userId },
      { gender: selectedGender }
    );

    userState.set(userId, "awaiting_name");
    await ctx.answerCbQuery("✅ Saqlandi!");

    await ctx.editMessageText("📝 Ajoyib! Endi **Ismingizni** kiriting:", {
      parse_mode: "Markdown",
    });
    return true;
  }

  if (data.startsWith("onboard_city_")) {
    const selectedCity = data.replace("onboard_city_", "");
    const temp = tempUserData.get(userId) || {};

    const updatedUser = await User.findOneAndUpdate(
      { telegramId: userId },
      {
        name: temp.name || "Foydalanuvchi",
        age: temp.age || 20,
        city: selectedCity,
      },
      { returnDocument: "after" }
    );

    userState.delete(userId);
    tempUserData.delete(userId);

    await ctx.answerCbQuery("✅ Saqlandi!");

    await ctx.editMessageText(
      `🎉 <b>Ma'lumotlaringiz saqlandi!</b>\n\n` +
        `📝 <b>Ism:</b> ${updatedUser.name}\n` +
        `🎂 <b>Yosh:</b> ${updatedUser.age}\n` +
        `📍 <b>Viloyat:</b> ${updatedUser.city}`,
      { parse_mode: "HTML" }
    );

    if (updatedUser.hasActivePremium()) {
      await promptVipGenderChoice(ctx);
    } else {
      await startUserSearch(bot, ctx, updatedUser);
    }
    return true;
  }

  if (data.startsWith("tanishuv_pref_")) {
    const selectedPref = data.replace("tanishuv_pref_", "");
    const dbUser = await User.findOne({ telegramId: userId });
    if (!dbUser) return false;

    dbUser.prefGender = selectedPref;
    await dbUser.save();

    await ctx.answerCbQuery("✅ Saqlandi!");

    const prefLabel =
      selectedPref === "female"
        ? "👩 Qizlar"
        : selectedPref === "male"
        ? "👨 O'g'il bolalar / Yigitlar"
        : "🌐 Har qanday jins";

    await ctx.editMessageText(
      `🎯 <b>Sherik jinsi saqlandi:</b> ${prefLabel}\n\nSherik qidirilmoqda...`,
      { parse_mode: "HTML" },
    );

    await startUserSearch(bot, ctx, dbUser);
    return true;
  }

  return false;
}
