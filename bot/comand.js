import Kanal from "../db/Kanal.js"; // Agar ES Modules bo'lsa .js kengaytmasini unutmang

export async function comand(ctx) {
  try {
    const randomKanalImg = await Kanal.aggregate([
      { $sample: { size: 1 } }, // Tasodifiy 1 dona hujjatni tanlab olish
    ]);
    const kanalLink = await Kanal.findOne({
      url: { $exists: true, $ne: null },
    });

    const kanalImg = randomKanalImg[0];
    const imgUrl = kanalImg?.imgurl;
    const chanelUrl = kanalLink?.url;

    // 3. Rasm va tugmalarni yuboramiz
    // Diqqat: replyreplyWithPhoto -> replyWithPhoto deb tuzatildi
    await ctx.replyWithPhoto(imgUrl, {
      caption: `🌟 **PREMIUM kontentga xush kelibsiz!**\n\n🔞 Siz so'rayotgan videoni topdim. Videoni to'liq ko'rmoqchi bo'sangiz quydagi shartlarni bajaring.\n\n🔓 **Ko'rish uchun 2 ta oddiy qadam:**\n1️⃣ Pastdagi **"📢  KANALGA QO'SHILISH"** tugmasini bosing va kirganingizda bot bergan barcha kanallarga qo'shiling.\n2️⃣ Qaytib kelib, **"✅ Tekshirish va ko'rish"** tugmasini bosing.\n\n_Bu mutlaqo bepul, shunchaki obuna bo'lish kifoya! 👇_`,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "📢 Kanalga qo'shilish",
              url: chanelUrl, // Dinamik havola joylashtirildi
            },
          ],
          [
            {
              text: "✅ Tekshirish va ko'rish",
              callback_data: "check_sub",
            },
          ],
        ],
      },
    });
  } catch (error) {
    console.error("Xatolik yuz berdi:", error);
    await ctx.reply("Xatolik yuz berdi. Iltimos qaytadan urunib ko'ring.");
  }
}
