import TelegramBot from "node-telegram-bot-api";
import admin from "firebase-admin";
import fs from "fs";

// =========================
//  LOAD BOT TOKEN FROM RENDER
// =========================
const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.log("❌ BOT_TOKEN missing!");
  process.exit(1);
}

// =========================
//  LOAD FIREBASE SERVICE ACCOUNT
// =========================
const serviceAccount = JSON.parse(
  fs.readFileSync("/etc/secrets/firebase.json", "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://earningmaster-default-rtdb.firebaseio.com/"
});

const db = admin.database();

// =========================
//  START TELEGRAM BOT
// =========================
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// =========================
//  OTP STORAGE
// =========================
const otpStore = {}; 
// otpStore[userId] = { code, expiresAt }


// =========================
//  /start COMMAND
// =========================
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from.first_name || "User";

  await bot.sendMessage(
    chatId,
    `👋 Hey *${name}*, And Welcome To *Earning Master Official Bot*\n\n` +
    `Here You Can Easily Earn Money, Get Daily Bonus, And Use Giveaway Redeem Codes 🎁`,
    { parse_mode: "Markdown" }
  );

  sendMainMenu(chatId);
});

// =========================
//  MAIN MENU INLINE KEYBOARD
// =========================
function sendMainMenu(chatId) {
  bot.sendMessage(chatId, "Choose an option:", {
    reply_markup: {
      keyboard: [
        [{ text: "💰 Check Balance" }, { text: "🔗 Link Account" }],
        [{ text: "🎁 Redeem Code" }, { text: "💸 Transfer Balance" }],
        [{ text: "📅 Daily Points" }, { text: "☎ Support" }]
      ],
      resize_keyboard: true
    }
  });
}


// =========================
//  HANDLE BUTTON CLICKS
// =========================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text === "🔗 Link Account") return handleLinkAccount(chatId);
  if (text === "💰 Check Balance") return handleCheckBalance(chatId);
});


// =========================
//  HANDLE LINK ACCOUNT
// =========================
async function handleLinkAccount(chatId) {

  // Check active code
  if (otpStore[chatId] && otpStore[chatId].expiresAt > Date.now()) {
    const remaining = Math.floor((otpStore[chatId].expiresAt - Date.now()) / 1000);
    return bot.sendMessage(
      chatId,
      `⚠ You already have an active verification code.\n` +
      `Please wait *${remaining} seconds* until it expires.`,
      { parse_mode: "Markdown" }
    );
  }

  // Generate new OTP
  const code = Math.floor(100000 + Math.random() * 900000);
  const expiresAt = Date.now() + 300000; // 300 sec

  otpStore[chatId] = { code, expiresAt };

  bot.sendMessage(
    chatId,
    `✅ *Your Verification Code: ${code}*\n\n` +
    `⏳ Expires in *300 seconds*\n\n` +
    `⚠ Do NOT share this with anyone.`,
    { parse_mode: "Markdown" }
  );

  // countdown updater
  let secondsLeft = 300;
  const countdown = setInterval(() => {
    secondsLeft--;
    if (secondsLeft <= 0) {
      delete otpStore[chatId];
      clearInterval(countdown);
    }
  }, 1000);
}


// =========================
//  CHECK BALANCE
// =========================
async function handleCheckBalance(chatId) {

  const linkRef = db.ref("TG_LINKS").child(chatId);

  const snap = await linkRef.once("value");

  if (!snap.exists()) {
    return bot.sendMessage(
      chatId,
      `⚠ Please link your Earning Master account first.\nClick on *Link Account* to continue.`,
      { parse_mode: "Markdown" }
    );
  }

  const uid7 = snap.child("uid7").val();

  const userSnap = await db.ref("users").child(uid7).once("value");

  if (!userSnap.exists())
    return bot.sendMessage(chatId, "❌ Account not found.");

  const balance = userSnap.child("balance").val() || 0;

  bot.sendMessage(
    chatId,
    `👤 UID: *${uid7}*\n💰 Account Balance: *₹${balance}*`,
    { parse_mode: "Markdown" }
  );
}


// =========================
//  VERIFY OTP FROM APP
// =========================
export async function verifyOtpAndLink(uid7, telegramId, enteredCode) {

  if (!otpStore[telegramId])
    return { success: false, message: "Code expired or not generated." };

  if (otpStore[telegramId].code != enteredCode)
    return { success: false, message: "Invalid code." };

  if (otpStore[telegramId].expiresAt < Date.now())
    return { success: false, message: "Expired code." };

  // Save link in Firebase
  await db.ref("TG_LINKS").child(telegramId).set({
    uid7: uid7
  });

  delete otpStore[telegramId];

  // Notify the user
  bot.sendMessage(
    telegramId,
    `🎉 Your Earning Master account *${uid7}* is now linked successfully!`,
    { parse_mode: "Markdown" }
  );

  return { success: true };
}