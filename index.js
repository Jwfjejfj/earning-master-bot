const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// READ firebase.json SECRET FILE
const firebaseFile = "/etc/secrets/firebase.json";
let firebaseData = {};

if (fs.existsSync(firebaseFile)) {
  firebaseData = JSON.parse(fs.readFileSync(firebaseFile, "utf8"));
}

// ---------------------------
// MAIN MENU BUTTONS
// ---------------------------
const mainMenu = {
  reply_markup: {
    keyboard: [
      [
        { text: "💰 Check Balance" },
        { text: "🔗 Link Account" }
      ],
      [
        { text: "🎁 Redeem Code" },
        { text: "💸 Transfer Balance" }
      ],
      [
        { text: "📆 Daily Points" },
        { text: "📞 Support" }
      ]
    ],
    resize_keyboard: true
  }
};

// ---------------------------
// START COMMAND
// ---------------------------
bot.onText(/\/start/, msg => {
  bot.sendMessage(
    msg.chat.id,
    "👋 Welcome to *Earning Master Bot*!\nChoose an option:",
    mainMenu
  );
});

// ---------------------------
// CHECK IF USER IS LINKED
// (fake for now = always false)
// ---------------------------
function isUserLinked(userId) {
  return false; // (test mode) always false
}

// ---------------------------
// HANDLERS
// ---------------------------

// 💰 CHECK BALANCE
bot.on("message", msg => {
  const text = msg.text;
  const chatId = msg.chat.id;

  if (text === "💰 Check Balance") {
    if (!isUserLinked(chatId)) {
      return bot.sendMessage(
        chatId,
        "⚠️ Please link your Earning Master account first.\nClick on *Link Account* to continue.",
        mainMenu
      );
    }

    bot.sendMessage(chatId, "Your balance is: ₹0.00 (test mode)");
  }

  // 🔗 LINK ACCOUNT
  if (text === "🔗 Link Account") {
    bot.sendMessage(
      chatId,
      "🔗 To link your account, please enter the OTP shown inside the Earning Master App.\n\n(Currently test mode)"
    );
  }

  // 🎁 REDEEM CODE
  if (text === "🎁 Redeem Code") {
    if (!isUserLinked(chatId)) {
      return bot.sendMessage(
        chatId,
        "⚠️ Please link your Earning Master account first.\nClick on *Link Account* to continue.",
        mainMenu
      );
    }

    bot.sendMessage(chatId, "Send your redeem code:");
  }

  // 💸 TRANSFER BALANCE
  if (text === "💸 Transfer Balance") {
    if (!isUserLinked(chatId)) {
      return bot.sendMessage(
        chatId,
        "⚠️ Please link your Earning Master account first.\nClick on *Link Account* to continue.",
        mainMenu
      );
    }

    bot.sendMessage(chatId, "Enter amount to transfer:");
  }

  // 📆 DAILY POINTS
  if (text === "📆 Daily Points") {
    if (!isUserLinked(chatId)) {
      return bot.sendMessage(
        chatId,
        "⚠️ Please link your Earning Master account first.\nClick on *Link Account* to continue.",
        mainMenu
      );
    }

    bot.sendMessage(chatId, "You received +1 daily point! (test)");
  }

  // 📞 SUPPORT
  if (text === "📞 Support") {
    bot.sendMessage(
      chatId,
      "📞 Support:\nEmail: support@earningmaster.com\nTelegram: @YourSupportID"
    );
  }
});