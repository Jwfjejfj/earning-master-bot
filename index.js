import TelegramBot from "node-telegram-bot-api";
import admin from "firebase-admin";

// ============================
//  FIREBASE SETUP
// ============================

const serviceAccount = JSON.parse(process.env.FIREBASE_JSON);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL
});

const db = admin.database();

// ============================
//  BOT INIT
// ============================

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// ============================
//  HELPER: Generate OTP
// ============================

function generate6Digit() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ============================
//  START COMMAND
// ============================

bot.onText(/\/start/, (msg) => {
  const name = msg.from.first_name || "User";

  const buttons = {
    reply_markup: {
      keyboard: [
        ["Daily Points", "Check Balance", "Redeem Code"],
        ["Link Account", "Transfer Balance", "Support"]
      ],
      resize_keyboard: true
    }
  };

  bot.sendMessage(
    msg.chat.id,
    `Hey ${name}, And Welcome To *Earning Master Official Bot* 🎉\n\nHere You Can Easily Earn Money, Get Daily Bonus And Get Giveaway Redeem Codes.`,
    { parse_mode: "Markdown", ...buttons }
  );
});

// ============================
//  HANDLE ALL BUTTON PRESSES
// ============================

bot.on("message", async (msg) => {
  const txt = msg.text;
  const chatId = msg.chat.id;

  // ignore /start because already handled
  if (txt.startsWith("/start")) return;

  const firebaseUID = await getUserLinkedUID(msg.from.id);

  // If user not linked:
  if (!firebaseUID && txt !== "Link Account") {
    bot.sendMessage(
      chatId,
      "🔗 Please *Link Your Earning Master App* With This Bot First.\nClick *Link Account* To Begin.",
      { parse_mode: "Markdown" }
    );
    return;
  }

  // =================
  //  LINK ACCOUNT
  // =================
  if (txt === "Link Account") {

    // check if already linked
    if (firebaseUID) {
      bot.sendMessage(chatId, "Your Telegram Is Already Linked.");
      return;
    }

    // create 6-digit OTP
    const code = generate6Digit();
    const now = Date.now();
    const expires = now + 300000; // 300 seconds

    await db.ref("VerificationCodes").child(code).set({
      tgid: msg.from.id.toString(),
      expires: expires
    });

    bot.sendMessage(
      chatId,
      `🔐 *Your Verification Code:*\n*${code}*\n\nDo NOT share it with anyone!\nExpires in *300 seconds*.`,
      { parse_mode: "Markdown" }
    );

    return;
  }

  // =================
  //  BALANCE
  // =================
  if (txt === "Check Balance") {

    const appUID = firebaseUID; // already confirmed linked
    const balSnap = await db.ref("Balances").child(appUID).child("amount").get();

    let bal = "0.00";
    if (balSnap.exists()) bal = balSnap.val();

    bot.sendMessage(
      chatId,
      `💳 *Your UID:* ${appUID}\n💰 *Balance:* ₹${bal}`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  // =================
  //  OTHER BUTTONS
  // =================

  bot.sendMessage(chatId, "Please Use The Buttons To Communicate.");
});

// ============================
//  GET USER LINKED UID
// ============================

async function getUserLinkedUID(telegramID) {
  const snap = await db.ref("UserFromTelegram").child(telegramID).get();
  if (snap.exists()) return snap.val();
  return null;
}

console.log("BOT RUNNING 24/7...");