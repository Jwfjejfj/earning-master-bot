const TelegramBot = require("node-telegram-bot-api");
const admin = require("firebase-admin");
const fs = require("fs");

// ----------------------
// 🔥 LOAD FIREBASE SECRET FILE FROM RENDER
// ----------------------
const serviceAccount = JSON.parse(
  fs.readFileSync("/etc/secrets/firebase.json", "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: serviceAccount.databaseURL
});

const db = admin.database();

// ----------------------
// 🤖 YOUR TELEGRAM BOT TOKEN
// ----------------------
const bot = new TelegramBot("8376303866:AAFt7D5U1_EzOmsuc8he_CBLy8XzE4BpjUs", { polling: true });

// ----------------------
// 📌 REPLY KEYBOARD BUTTONS
// ----------------------
const mainMenu = {
  reply_markup: {
    keyboard: [
      ["Check Balance", "Current Balance"],
      ["Daily Points", "Redeem Code"],
      ["Support", "Link Account"]
    ],
    resize_keyboard: true
  }
};

// ----------------------
// 🛡 CHECK IF USER LINKED ACCOUNT
// ----------------------
async function isLinked(telegramId) {
  const snap = await db.ref("BotLinks/" + telegramId).once("value");
  return snap.exists();
}

// ----------------------
// 🚀 /start COMMAND
// ----------------------
bot.onText(/\/start/, async (msg) => {
  const name = msg.from.first_name;
  const chatId = msg.chat.id;

  bot.sendMessage(
    chatId,
    `🔥 Hey *${name}*, welcome to Earning Master Official Bot!\n\n` +
      `🤖 Here you can earn money using Redeem Codes & Daily Points.`,
    { parse_mode: "Markdown", ...mainMenu }
  );
});

// ----------------------
// 📌 BUTTON HANDLING
// ----------------------
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Skip /start because we handled it already
  if (text === "/start") return;

  // If user types random messages
  const validButtons = [
    "Check Balance",
    "Current Balance",
    "Daily Points",
    "Redeem Code",
    "Support",
    "Link Account"
  ];

  // If user sends text not in buttons
  if (!validButtons.includes(text)) {
    bot.sendMessage(chatId, "❌ Please use the buttons to communicate.");
    return;
  }

  // If user clicks ANY button — check link first
  const linked = await isLinked(msg.from.id);
  if (!linked && text !== "Link Account") {
    bot.sendMessage(
      chatId,
      "⚠️ Please link your Earning Master app account before using commands.\n\n" +
        "Click *Link Account* button to continue.",
      { parse_mode: "Markdown" }
    );
    return;
  }

  // --------------------------
  // BUTTON ACTIONS
  // --------------------------

  if (text === "Link Account") {
    bot.sendMessage(
      chatId,
      "🔗 *Link Account Instructions:*\n\n" +
        "1️⃣ Open *Earning Master App*\n" +
        "2️⃣ Go to *Telegram Bot Linking*\n" +
        "3️⃣ Enter OTP shown on Telegram Bot\n" +
        "4️⃣ Done ✔️",
      { parse_mode: "Markdown" }
    );
  }

  if (text === "Check Balance") {
    bot.sendMessage(chatId, "💰 Balance Feature Coming Soon.");
  }

  if (text === "Current Balance") {
    bot.sendMessage(chatId, "💸 Current Balance feature unavailable.");
  }

  if (text === "Daily Points") {
    bot.sendMessage(chatId, "🎁 Daily Points feature coming soon.");
  }

  if (text === "Redeem Code") {
    bot.sendMessage(chatId, "🎟 Redeem Code system coming soon.");
  }

  if (text === "Support") {
    bot.sendMessage(chatId, "📞 Support Coming Soon.");
  }
});