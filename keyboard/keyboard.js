export const adminKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: "📊 Statistika" }],

      [{ text: "📢 Kanal qo'shish" }, { text: "🔗 Rasm linki" }],
      [{ text: "📤 Habar yuborish" }, { text: "➖ Kanal uzish" }],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  },
};

export const userKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: "🔞 Uzbekcha Video" }, { text: "🔞 Ruscha Video (top)" }],
      [{ text: "Barchasini ko'rish 💦" }],
      [{ text: "💬 Tanishuv" }, { text: "💎 Premium (VIP)" }],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  },
};

export const tanishuvKeyboard = {
  reply_markup: {
    keyboard: [[{ text: "🛑 Stop" }, { text: "➡️ Keyingisi" }]],
    resize_keyboard: true,
    one_time_keyboard: false,
  },
};

