import User from "../db/User.js";
import { femalePartners, malePartners } from "../config/partners.js";

export const CITIES = [
  "Toshkent",
  "Samarqand",
  "Farg'ona",
  "Andijon",
  "Namangan",
  "Buxoro",
  "Navoiy",
  "Qashqadaryo",
  "Surxondaryo",
  "Xorazm",
  "Jizzax",
  "Sirdaryo",
  "Qoraqalpog'iston",
];

export async function handlePremiumText(bot, ctx, text, userId, dbUser) {
  if (text === "💎 Premium (VIP)") {
    const isVip = dbUser.hasActivePremium();

    if (isVip) {
      const expires = dbUser.premiumExpiresAt
        ? new Date(dbUser.premiumExpiresAt).toLocaleDateString("uz-UZ")
        : "Cheksiz";

      return ctx.reply(
        `👑 <b>Sizning VIP Statusingiz FAOL!</b>\n\n` +
          `📅 <b>Amal qilish muddati:</b> ${expires} gacha\n\n` +
          `<b>Sizdagi Imkoniyatlar:</b>\n` +
          `⚡️ Navbatsiz va tezkor real sherik bilan ulanish\n` +
          `🎯 Shahar: <b>${dbUser.prefCity === "all" ? "Barcha viloyatlar" : dbUser.prefCity}</b>\n` +
          `👥 Afzal jins: <b>${dbUser.prefGender === "female" ? "Qizlar" : dbUser.prefGender === "male" ? "Yigitlar" : "Farqi yo'q"}</b>\n` +
          `🤖 Tanlangan AI hamroh: <b>${dbUser.selectedAiPartner || "Tasodifiy"}</b>\n` +
          `📸 Photo, Voice va Sticker yuborish huquqi\n\n` +
          `👇 VIP Sozlamalarini o'zgartirish uchun tugmani bosing:`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "⚙️ VIP Filtrlarni Sozlash",
                  callback_data: "vip_settings_menu",
                },
              ],
              [
                {
                  text: "🤖 AI Hamrohni Tanlash",
                  callback_data: "vip_ai_menu",
                },
              ],
            ],
          },
        },
      );
    }

    return ctx.reply(
      `💎 <b>VIP Premium Imkoniyatlar !</b>\n\n` +
        `Botda eng qulay va qiziqarli muloqot tajribasiga ega bo'ling:\n\n` +
        `⚡️ <b>Navbatsiz va Tezkor Ulanish:</b> Kutishlarsiz birinchi bo'lib real sheriklar bilan ulaning!\n` +
        `🎯 <b>Viloyat va Jins Filtrlar:</b> Aynan o'zingiz xohlagan shahardan sherik toping!\n` +
        `🤖 <b>Cheksiz AI Suhbat:</b> Hech qanday limit va reklamasiz AI hamrohingiz bilan gurunglashing!\n` +
        `📸 <b>Media Uzatish:</b> Real suhbatda rasm, ovozli xabarlar va stikerlar yuboring!\n` +
        `👑 <b>VIP Nishoni:</b> Profilingizda va suhbatda VIP status belgingiz namoyon bo'ladi!\n\n` +
        `💰 <b>Narxi:</b> 50 Telegram Stars / 30 Kun`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "⭐ 50 Stars bilan VIP sotib olish",
                callback_data: "buy_premium_stars",
              },
            ],
          ],
        },
      },
    );
  }

  return false;
}

export async function handlePremiumCallback(bot, ctx, data, userId, dbUser) {
  if (data === "buy_premium_stars") {
    await ctx.answerCbQuery();

    return ctx.replyWithInvoice({
      title: "👑 VIP Premium Obuna (30 Kun)",
      description:
        "Navbatsiz ulanish, Viloyat/Jins filtri, Cheksiz AI va Rasm/Voice yuborish huquqi!",
      payload: `vip_subscription_${userId}_${Date.now()}`,
      provider_token: "", // Telegram Stars uchun bo'sh string shart
      currency: "XTR",
      prices: [{ label: "30 Kunlik VIP Premium", amount: 50 }],
      start_parameter: "vip_subscription",
    });
  }

  if (data === "vip_settings_menu") {
    if (!dbUser.hasActivePremium()) {
      return ctx.answerCbQuery("⚠️ Bu menyu faqat VIP a'zolar uchun!", {
        show_alert: true,
      });
    }
    await ctx.answerCbQuery();

    return ctx.editMessageText(
      `⚙️ <b>VIP Qidiruv Sozlamalari</b>\n\n` +
        `Hozirgi sozlamalaringiz:\n` +
        `📍 <b>Viloyat:</b> ${dbUser.prefCity === "all" ? "Barchasi" : dbUser.prefCity}\n` +
        `👥 <b>Sherik jinsi:</b> ${dbUser.prefGender === "female" ? "Qizlar" : dbUser.prefGender === "male" ? "Yigitlar" : "Farqi yo'q"}\n\n` +
        `O'zgartirmoqchi bo'lgan parametrni tanlang:`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📍 Viloyatni tanlash",
                callback_data: "vip_choose_city",
              },
            ],
            [
              {
                text: "👨 Faqat Yigitlar",
                callback_data: "vip_set_gender_male",
              },
              {
                text: "👩 Faqat Qizlar",
                callback_data: "vip_set_gender_female",
              },
            ],
            [
              {
                text: "🌐 Har qanday jins",
                callback_data: "vip_set_gender_any",
              },
            ],
          ],
        },
      },
    );
  }

  if (data === "vip_choose_city") {
    await ctx.answerCbQuery();
    const cityButtons = CITIES.map((c) => [
      { text: `📍 ${c}`, callback_data: `vip_city_${c}` },
    ]);
    cityButtons.unshift([
      { text: "🌐 Barcha viloyatlar", callback_data: "vip_city_all" },
    ]);

    return ctx.editMessageText("📍 O'zingiz qidirayotgan viloyatni tanlang:", {
      reply_markup: {
        inline_keyboard: cityButtons,
      },
    });
  }

  if (data.startsWith("vip_city_")) {
    const selectedCity = data.replace("vip_city_", "");
    dbUser.prefCity = selectedCity;
    await dbUser.save();
    await ctx.answerCbQuery("✅ Viloyat saqlandi!");

    return ctx.editMessageText(
      `✅ Viloyat filtri saqlandi: <b>${selectedCity === "all" ? "Barcha viloyatlar" : selectedCity}</b>`,
      { parse_mode: "HTML" },
    );
  }

  if (data.startsWith("vip_set_gender_")) {
    const selectedG = data.replace("vip_set_gender_", "");
    dbUser.prefGender = selectedG;
    await dbUser.save();
    await ctx.answerCbQuery("✅ Jins filtri saqlandi!");

    return ctx.editMessageText(
      `✅ Jins filtri saqlandi: <b>${selectedG === "female" ? "Faqat qizlar" : selectedG === "male" ? "Faqat yigitlar" : "Farqi yo'q"}</b>`,
      { parse_mode: "HTML" },
    );
  }

  if (data === "vip_ai_menu") {
    if (!dbUser.hasActivePremium()) {
      return ctx.answerCbQuery("⚠️ Bu menyu faqat VIP a'zolar uchun!", {
        show_alert: true,
      });
    }
    await ctx.answerCbQuery();

    const partners = dbUser.gender === "female" ? malePartners : femalePartners;
    const aiButtons = partners.map((p) => [
      {
        text: `🌸 ${p.name} (${p.age} yosh)`,
        callback_data: `vip_select_ai_${p.name}`,
      },
    ]);
    aiButtons.unshift([
      { text: "🎲 Tasodifiy AI", callback_data: "vip_select_ai_random" },
    ]);

    return ctx.editMessageText(
      "🤖 O'zingiz xohlagan AI suhbatdoshni tanlang:",
      {
        reply_markup: {
          inline_keyboard: aiButtons,
        },
      },
    );
  }

  if (data.startsWith("vip_select_ai_")) {
    const partnerName = data.replace("vip_select_ai_", "");
    dbUser.selectedAiPartner = partnerName === "random" ? null : partnerName;
    await dbUser.save();
    await ctx.answerCbQuery("✅ AI hamroh saqlandi!");

    return ctx.editMessageText(
      `✅ AI suhbatdoshingiz <b>${partnerName === "random" ? "Tasodifiy" : partnerName}</b> qilib belgilandi!`,
      { parse_mode: "HTML" },
    );
  }

  return false;
}

export async function handleSuccessfulPayment(bot, ctx) {
  const userId = ctx.from.id.toString();
  const payment = ctx.message.successful_payment;

  if (payment && payment.currency === "XTR") {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 kun

    await User.findOneAndUpdate(
      { telegramId: userId },
      {
        isPremium: true,
        premiumExpiresAt: expiresAt,
      },
    );

    await ctx.reply(
      `🎉 <b>TABRIKLAYMIZ! VIP PREMIUM STATUS MUVAFFAQIYATLI FAOL-LASHTIRILDI!</b>\n\n` +
        `👑 Siz 30 kun davomida quyidagi imkoniyatlarga ega bo'ldingiz:\n` +
        `⚡️ Navbatsiz real foydalanuvchilar bilan tezkor ulanish\n` +
        `🎯 Viloyat va Jins filtri bo'yicha sherik izlash\n` +
        `🤖 Cheksiz va tanlovli AI suhbati\n` +
        `📸 Real chatda Photo, Voice va Sticker uzatish\n\n` +
        `Tanishuvni boshlash uchun <b>"💬 Tanishuv"</b> tugmasini bosing!`,
      { parse_mode: "HTML" },
    );
  }
}
