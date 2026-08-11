import { userState, activePartner } from "../config/state.js";
import {
  getRandomPartner,
  femalePartners,
  malePartners,
} from "../config/partners.js";
import { startInitialGreetingTimer } from "./aiService.js";
import { tanishuvKeyboard, userKeyboard } from "../keyboard/keyboard.js";

// Queue of real users waiting for a partner: array of { userId, dbUser }
const waitingQueue = [];

// Active real pairings: userId -> partnerUserId
export const activeRealPartners = new Map();

// Timers for 10-15 min fallback to AI: userId -> timeoutId
const searchTimers = new Map();

/**
 * Checks if User A's criteria match User B
 */
function isCompatibleMatch(userA, userB) {
  // Check User A's preferences if User A is Premium
  if (userA.hasActivePremium()) {
    if (
      userA.prefGender &&
      userA.prefGender !== "any" &&
      userB.gender &&
      userA.prefGender !== userB.gender
    ) {
      return false;
    }
    if (
      userA.prefCity &&
      userA.prefCity !== "all" &&
      userB.city &&
      userA.prefCity.toLowerCase() !== userB.city.toLowerCase()
    ) {
      return false;
    }
  }

  // Check User B's preferences if User B is Premium
  if (userB.hasActivePremium()) {
    if (
      userB.prefGender &&
      userB.prefGender !== "any" &&
      userA.gender &&
      userB.prefGender !== userA.gender
    ) {
      return false;
    }
    if (
      userB.prefCity &&
      userB.prefCity !== "all" &&
      userA.city &&
      userB.prefCity.toLowerCase() !== userA.city.toLowerCase()
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Starts search for a real partner with VIP Priority & Filters
 */
export async function startUserSearch(bot, ctx, dbUser) {
  const userId = dbUser.telegramId;
  const isVip = dbUser.hasActivePremium();

  if (userState.get(userId) === "searching_partner") {
    return ctx.reply(
      "🔎 Siz allaqachon sherik qidiryapsiz... Kuting.\n\n❌ Bekor qilish uchun: 🛑 Stop bosing.",
      { parse_mode: "HTML", ...tanishuvKeyboard },
    );
  }

  // Look for a compatible waiting partner in the queue
  const queueIndex = waitingQueue.findIndex(
    (item) => item.userId !== userId && isCompatibleMatch(dbUser, item.dbUser),
  );

  if (queueIndex !== -1) {
    const partnerData = waitingQueue.splice(queueIndex, 1)[0];
    const partnerId = partnerData.userId;
    const partnerDbUser = partnerData.dbUser;

    if (searchTimers.has(partnerId)) {
      clearTimeout(searchTimers.get(partnerId));
      searchTimers.delete(partnerId);
    }

    userState.set(userId, "real_chatting");
    userState.set(partnerId, "real_chatting");

    activeRealPartners.set(userId, partnerId);
    activeRealPartners.set(partnerId, userId);

    const userAVipBadge = isVip ? "(💎 VIP ) " : "";
    const partnerVipBadge = partnerDbUser.hasActivePremium() ? "👑 VIP " : "";

    // Notify User A
    await ctx.reply(
      `🎉 <b>Real sherik topildi!</b>\n\n` +
        `👤 <b>Ismi:</b> ${partnerVipBadge}${partnerDbUser.name || "Noma'lum"}\n` +
        `🎂 <b>Yoshi:</b> ${partnerDbUser.age || "Noma'lum"}\n` +
        `📍 <b>Viloyat:</b> ${partnerDbUser.city || "Ko'rsatilmagan"}\n\n` +
        `💬 Xabaringizni yozing, u sherigingizga yetkaziladi. \n`,
      { parse_mode: "HTML", ...tanishuvKeyboard },
    );

    // Notify User B
    await bot.telegram.sendMessage(
      partnerId,
      `🎉 <b>Sizga ajoyib sherik topildi!</b>\n\n` +
        `<blockquote>👑 <b>VIP SUHBATDOSH!</b>\n\n` +
        `👤 <b>Ismi:</b> ${dbUser.name || "Noma'lum"}               ${userAVipBadge}\n` +
        `🎂 <b>Yoshi:</b> ${dbUser.age || "Noma'lum"}\n` +
        `📍 <b>Viloyat:</b> ${dbUser.city || "Ko'rsatilmagan"}</blockquote>\n\n` +
        `💬 <i>Bu foydalanuvchi botimizning VIP a'zosi. Suhbatni boshlash uchun xabaringizni yozing!</i>`,
      { parse_mode: "HTML", ...tanishuvKeyboard },
    );
    return;
  }

  // Put into queue: VIP users get unshifted (placed at front of queue)
  if (isVip) {
    waitingQueue.unshift({ userId, dbUser });
  } else {
    waitingQueue.push({ userId, dbUser });
  }

  userState.set(userId, "searching_partner");

  const vipBadgeMsg = isVip ? "👑 <b>VIP Ustuvor qidiruv:</b> " : "";

  await ctx.reply(
    `🔎 ${vipBadgeMsg}<b>Tanishish uchun real sherik qidirilmoqda...</b> Kuting.\n\n` +
      `⏱ <i>Suhbatdosh qidirilmoqda.</i>\n\n` +
      `❌ Qidiruvni bekor qilish uchun 🛑 Stop bosing.`,
    { parse_mode: "HTML", ...tanishuvKeyboard },
  );

  // 10-15 min fallback timer to AI
  const waitMinutes = Math.floor(Math.random() * 6) + 10;
  const waitMs = waitMinutes * 60 * 1000;

  const timer = setTimeout(async () => {
    try {
      const idx = waitingQueue.findIndex((u) => u.userId === userId);
      if (idx !== -1) {
        waitingQueue.splice(idx, 1);
      }
      searchTimers.delete(userId);

      if (userState.get(userId) === "searching_partner") {
        // If VIP user selected specific AI partner, use it!
        let partner;
        if (isVip && dbUser.selectedAiPartner) {
          partner = { name: dbUser.selectedAiPartner, age: 20 };
        } else if (isVip && dbUser.prefGender && dbUser.prefGender !== "any") {
          const targetList =
            dbUser.prefGender === "female" ? femalePartners : malePartners;
          partner = targetList[Math.floor(Math.random() * targetList.length)];
        } else {
          partner = getRandomPartner(dbUser.gender || "male");
        }

        activePartner.set(userId, partner);
        userState.set(userId, "ai_chatting");

        await bot.telegram.sendMessage(
          userId,
          `🌸 <b>Hozircha real sherik bo'sh emas edi.</b> Siz uchun sun'iy intellekt hamrohingiz <b>${partner.name} (${partner.age} yosh)</b> bilan suhbat ochildi!\n\n` +
            `Unga biror narsa deb yozing (Masalan: <i>Salom, yaxshimisiz?</i>)\n\n` +
            `❌ Suhbatdan chiqish uchun: 🛑 Stop deb yozing.`,
          { parse_mode: "HTML", ...tanishuvKeyboard },
        );

        startInitialGreetingTimer(bot, ctx, userId, dbUser);
      }
    } catch (e) {
      console.error("AI Fallback Timer Error:", e.message);
    }
  }, waitMs);

  searchTimers.set(userId, timer);
}

export function cancelSearch(userId) {
  const idx = waitingQueue.findIndex((u) => u.userId === userId);
  if (idx !== -1) {
    waitingQueue.splice(idx, 1);
  }
  if (searchTimers.has(userId)) {
    clearTimeout(searchTimers.get(userId));
    searchTimers.delete(userId);
  }
  userState.delete(userId);
}

export async function stopRealChat(bot, userId) {
  const partnerId = activeRealPartners.get(userId);

  if (partnerId) {
    userState.delete(partnerId);
    activeRealPartners.delete(partnerId);

    try {
      await bot.telegram.sendMessage(
        partnerId,
        "🚪 Suhbatdosh suhbatni yakunladi. Asosiy menuga qaytdingiz.",
        userKeyboard,
      );
    } catch (e) {
      console.error("Error sending stop notification to partner:", e.message);
    }
  }

  userState.delete(userId);
  activeRealPartners.delete(userId);

  return "🚪 Suhbatni yakunladingiz. Asosiy menuga qaytdingiz.";
}

/**
 * Forwards message sent by userId to partner with Media privilege check for Non-VIPs
 */
export async function forwardMessageToPartner(bot, ctx, userId, dbUser) {
  const partnerId = activeRealPartners.get(userId);
  if (!partnerId) return false;

  // Check Media permissions: Non-VIPs can only send text messages
  if (!dbUser.hasActivePremium() && !ctx.message.text) {
    await ctx.reply(
      "⚠️ <b>Rasm, ovozli xabar va stikerlar yuborish faqat 👑 VIP a'zolar uchun!</b>\n\nVIP status olish uchun <b>'💎 Premium (VIP)'</b> tugmasini bosing.",
      { parse_mode: "HTML" },
    );
    return true;
  }

  try {
    await bot.telegram.copyMessage(
      partnerId,
      ctx.chat.id,
      ctx.message.message_id,
    );
    return true;
  } catch (err) {
    console.error("Failed to forward message to partner:", err.message);
    if (err.response && err.response.error_code === 403) {
      await stopRealChat(bot, partnerId);
      await ctx.reply(
        "⚠️ Suhbatdoshingiz botni bloklaganligi sababli suhbat yakunlandi.",
      );
    }
    return false;
  }
}
