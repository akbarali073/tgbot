import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import { startHandler } from "./bot/start.js";
import { handlers } from "./handlers/handlers.js";
import { callbackHandler } from "./calback/calback.js";
import connectDB from "./db/db.js";
import express from "express";
dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Bot jonli!");
});

app.listen(process.env.PORT, () => {
  console.log("Bot Serverda ishlamoqda ✅");
});

await connectDB();

bot.start(startHandler);

handlers(bot);
callbackHandler(bot);

bot
  .launch()
  .then(() => console.log("Bot ishga tushdi 🚀"))
  .catch(console.error);
