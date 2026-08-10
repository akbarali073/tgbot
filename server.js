import express from "express";
import Kanal from "./db/Kanal.js";
import User from "./db/User.js";
import mongoose from "mongoose";
import cors from "cors";
import connectDB from "./db/db.js";

const app = express();
app.use(express.json());
app.use(cors());

await connectDB();

// // Tasodifiy vaqt generatsiya qilish
// function generateRandomTime() {
//   const mins = Math.floor(Math.random() * (30 - 10 + 1)) + 10; // 10-30 daqiqa
//   const secs = Math.floor(Math.random() * 60); // 0-59 soniya

//   return {
//     formatted: `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`,
//     totalMinutes: mins + secs / 60, // MB ni to'g'ri hisoblash uchun
//   };
// }

// async function updateOldData() {
//   try {
//     const videos = await Kanal.find({});

//     console.log(
//       `Jami ${videos.length} ta video topildi. Yangilash boshlandi...`,
//     );

//     for (const video of videos) {
//       const randomViews = Math.floor(Math.random() * (5000 - 100 + 1)) + 100;
//       const { formatted: randomTime, totalMinutes } = generateRandomTime();

//       // Hajmni to'g'ri raqam ko'rinishida hisoblaymiz (masalan: 14.5 daqiqa * 3.2 = 46.4 MB)
//       const randomHajmi = Number((totalMinutes * 7.2).toFixed(1));

//       // Bazani yangilaymiz
//       await Kanal.findByIdAndUpdate(video._id, {
//         $set: {
//           views: randomViews,
//           minutes: randomTime,
//           hajmi: randomHajmi,
//         },
//       });
//     }

//     console.log("✅ Hamma ma'lumotlar muvaffaqiyatli yangilandi!");
//   } catch (error) {
//     console.error("Xatolik yuz berdi:", error);
//   }
// }

// updateOldData();
app.get("/user", async (req, res) => {
  try {
    const { lastId } = req.query; // Oxirgi ko'ringan foydalanuvchi ID si
    const limit = 20;

    // Filter yaratamiz: agar lastId bo'lsa, undan kichik (eskiroq) ID larni qidiradi
    const query = lastId ? { _id: { $lt: lastId } } : {};

    const users = await User.find(query).sort({ _id: -1 }).limit(limit);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/img", async (req, res) => {
  try {
    const data = await Kanal.find({}).sort({ _id: -1 });
    res.json(data);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server xatosi" });
  }
});

app.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedItem = await Kanal.findByIdAndDelete(id);

    if (!deletedItem) {
      return res.status(404).json({ message: "Rasm topilmadi" });
    }

    res.json({ message: "Rasm muvaffaqiyatli o'chirildi" });
  } catch (err) {
    console.error("Xatolik:", err);
    res.status(500).json({ message: "Serverda xatolik" });
  }
});

app.listen(4000, () => {
  console.log("🚀 Server 4000-portda ishga tushdi");
});
