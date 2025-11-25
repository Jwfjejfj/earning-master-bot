import TelegramBot from "node-telegram-bot-api";
import admin from "firebase-admin";
import fs from "fs";

// Load Firebase Admin SDK (from Render Secret File)
const serviceAccount = JSON.parse(
  fs.readFileSync("/etc/secrets/firebase.json", "utf8")
);

// Init Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Bot token loaded from Render ENV variable
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// Button Menu
const mainMenu = {
  reply_markup: {
    keyboard: [
      ["💰 Check Balance"],
      ["📤 Redeem Code"],
      ["📥 Daily Points"],
      ["📞 Support"],
      ["🔗 Link Account"],
      ["💳 Current Balance"]
    ],
    resize_keyboard: true
  }
};

// START Command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from.first_name || "User";

  await bot.sendMessage(
    chatId,
    `Hey ${name}, welcome to Earning Master Official Bot!\n\nHere you can earn money using Redeem Codes & Daily Points 😊`,
    mainMenu
  );
});

// Handle Button Press
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const txt = msg.text;

  // Ignore /start (already handled)
  if (txt === "/start") return;

  // If user types manually → block
  const buttons = [
    "💰 Check Balance",
    "📤 Redeem Code",
    "📥 Daily Points",
    "📞 Support",
    "🔗 Link Account",
    "💳 Current Balance"
  ];

  if (!buttons.includes(txt)) {
    return bot.sendMessage(
      chatId,
      "⚠️ Please use the buttons to communicate with the bot."
    );
  }

  // ✨ Every button requires linking first (as you requested)
  if (txt !== "🔗 Link Account") {
    return bot.sendMessage(
      chatId,
      "⚠️ Please link your Earning Master app account with this bot first.\n\nClick on **Link Account** to continue."
    );
  }

  // 🔗 Link Account button
  if (txt === "🔗 Link Account") {
    return bot.sendMessage(
      chatId,
      "🔗 To link your account, please enter the OTP shown inside the Earning Master App.\n\n(Currently test mode)"
    );
  }
});