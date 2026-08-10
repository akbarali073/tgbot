import { userState, activePartner } from "../config/state.js";
import { getRandomPartner } from "../config/partners.js";
import { startInitialGreetingTimer } from "./aiService.js";

// Queue of real users waiting for a partner
// Array of { userId, dbUser }
const waitingQueue = [];

// Active real pairings: userId -> partnerUserId
export const activeRealPartners = new Map();

// Timers for 10-15 min fallback to AI: userId -> timeoutId
const searchTimers = new Map();

/**
 * Starts search for a real partner or queues user with a 10-15 minute fallback timer to AI.
 */
export async function startUserSearch(bot, ctx, dbUser) {
  const userId = dbUser.telegramId;

  // If user is already waiting, do nothing or inform
  if (userState.get(userId) === "searching_partner") {
    return ctx.reply(
      "🔎 Siz allaqachon sherik qidiryapsiz... Kuting.\n\n❌ Bekor qilish uchun: /stop",
      { parse_mode: "HTML" },
    );
  }

  // Check if there is another real user waiting in the queue
  const queueIndex = waitingQueue.findIndex((u) => u.userId !== userId);

  if (queueIndex !== -1) {
    // Found a waiting real user!
    const partnerData = waitingQueue.splice(queueIndex, 1)[0];
    const partnerId = partnerData.userId;
    const partnerDbUser = partnerData.dbUser;

    // Clear partner's wait timer
    if (searchTimers.has(partnerId)) {
      clearTimeout(searchTimers.get(partnerId));
      searchTimers.delete(partnerId);
    }

    // Set states to real_chatting
    userState.set(userId, "real_chatting");
    userState.set(partnerId, "real_chatting");

    // Link real partners
    activeRealPartners.set(userId, partnerId);
    activeRealPartners.set(partnerId, userId);

    // Notify User A
    await ctx.reply(
      `🎉 <b>Real sherik topildi!</b>\n\n` +
        `👤 <b>Ismi:</b> ${partnerDbUser.name || "Noma'lum"}\n` +
        `🎂 <b>Yoshi:</b> ${partnerDbUser.age || "Noma'lum"}\n\n` +
        `💬 Xabaringizni yozing, u sherigingizga yetkaziladi.\n` +
        `❌ Suhbatni yakunlash uchun: <code>/stop</code> deb yozing.`,
      { parse_mode: "HTML" },
    );

    // Notify User B
    await bot.telegram.sendMessage(
      partnerId,
      `🎉 <b>Real sherik topildi!</b>\n\n` +
        `👤 <b>Ismi:</b> ${dbUser.name || "Noma'lum"}\n` +
        `🎂 <b>Yoshi:</b> ${dbUser.age || "Noma'lum"}\n\n` +
        `💬 Xabaringizni yozing, u sherigingizga yetkaziladi.\n` +
        `❌ Suhbatni yakunlash uchun: <code>/stop</code> deb yozing.`,
      { parse_mode: "HTML" },
    );

    return;
  }

  // No real partner currently waiting -> put user in queue
  waitingQueue.push({ userId, dbUser });
  userState.set(userId, "searching_partner");

  await ctx.reply(
    `🔎 <b>Tanishish uchun sherik qidirilmoqda...</b> Kuting.\n\n` +
      `⏱ <i>Suhbatdosh tez orada topiladi. </i>\n\n` +
      `❌ Qidiruvni bekor qilish uchun: /stop deb yozing.`,
    { parse_mode: "HTML" },
  );

  // Set 10-15 minute timer for AI fallback
  // Random duration between 10 and 15 minutes (in ms)
  const waitMinutes = Math.floor(Math.random() * 6) + 10; // 10..15 minutes
  const waitMs = waitMinutes * 60 * 1000;

  const timer = setTimeout(async () => {
    try {
      // Remove from queue if still waiting
      const idx = waitingQueue.findIndex((u) => u.userId === userId);
      if (idx !== -1) {
        waitingQueue.splice(idx, 1);
      }
      searchTimers.delete(userId);

      // If user is still in searching state, assign AI partner
      if (userState.get(userId) === "searching_partner") {
        const partner = getRandomPartner(dbUser.gender || "male");
        activePartner.set(userId, partner);
        userState.set(userId, "ai_chatting");

        await bot.telegram.sendMessage(
          userId,
          `🌸 <b>Suhbatdosh topildi! <b>${partner.name} (${partner.age} yosh)</b> bilan suhbat ochildi!\n\n` +
            `Unga biror narsa deb yozing (Masalan: <i>Salom, yaxshimisiz?</i>)\n\n` +
            `❌ Suhbatdan chiqish uchun: <code>/stop</code> deb yozing.`,
          { parse_mode: "HTML" },
        );

        startInitialGreetingTimer(bot, ctx, userId, dbUser);
      }
    } catch (e) {
      console.error("AI Fallback Timer Error:", e.message);
    }
  }, waitMs);

  searchTimers.set(userId, timer);
}

/**
 * Cancels active search queue for user.
 */
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

/**
 * Stops an active real user chat session.
 */
export async function stopRealChat(bot, userId) {
  const partnerId = activeRealPartners.get(userId);

  if (partnerId) {
    userState.delete(partnerId);
    activeRealPartners.delete(partnerId);

    try {
      await bot.telegram.sendMessage(
        partnerId,
        "🚪 Suhbatdosh suhbatni yakunladi. Asosiy menuga qaytdingiz.",
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
 * Forwards message sent by userId to their connected real partner.
 */
export async function forwardMessageToPartner(bot, ctx, userId) {
  const partnerId = activeRealPartners.get(userId);
  if (!partnerId) return false;

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
      // Partner blocked the bot -> end chat
      await stopRealChat(bot, partnerId);
      await ctx.reply(
        "⚠️ Suhbatdoshingiz botni bloklaganligi sababli suhbat yakunlandi.",
      );
    }
    return false;
  }
}
