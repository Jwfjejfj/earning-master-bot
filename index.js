// =========================
//  EARNING MASTER BOT
//  FINAL WORKING VERSION
// =========================

const { Telegraf, Markup } = require("telegraf");
const admin = require("firebase-admin");

// Load Firebase Admin from secret file
const serviceAccount = require("/etc/secrets/firebase.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://earningmaster-default-rtdb.firebaseio.com/"
});

const db = admin.database();
const bot = new Telegraf(process.env.BOT_TOKEN);

// ------------------------------
//       BUTTON LAYOUT
// ------------------------------
const mainMenu = Markup.inlineKeyboard([
  [
    Markup.button.callback("💰 Check Balance", "CHECK_BAL"),
    Markup.button.callback("🔗 Link Account", "LINK_ACC")
  ],
  [
    Markup.button.callback("🎁 Redeem Code", "REDEEM"),
    Markup.button.callback("💸 Transfer Balance", "TRANSFER")
  ],
  [
    Markup.button.callback("📅 Daily Points", "DAILY"),
    Markup.button.callback("📞 Support", "SUPPORT")
  ]
]);

// ------------------------------
//         /start COMMAND
// ------------------------------
bot.start(async (ctx) => {
  try {
    const name = ctx.from.first_name || "User";

    await ctx.reply(
      `👋 Hey **${name}**, And Welcome To *Earning Master Official Bot*\n\n` +
      `Here You Can Easily Earn Money, Get Daily Bonus And Use Giveaway Redeem Codes 🎁`,
      { parse_mode: "Markdown" }
    );

    await ctx.reply("Choose an option:", mainMenu);
  } catch (e) {
    console.log("Start Error:", e);
  }
});

// ------------------------------
//      LINK ACCOUNT BUTTON
// ------------------------------
bot.action("LINK_ACC", async (ctx) => {
  try {
    const userID = ctx.from.id.toString();

    const otpRef = db.ref("OTP").child(userID);
    const snap = await otpRef.once("value");

    if (snap.exists()) {
      return ctx.reply(
        "⚠️ You already have an active verification code.\nPlease wait until it expires."
      );
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 300000; // 300 seconds

    await otpRef.set({
      otp: otp,
      expires: expiry
    });

    return ctx.reply(
      `✅ *Your Verification Code:* ${otp}\n\n⏳ *Expires in:* 300 seconds\n\n⚠️ Do NOT share this with anyone.`,
      { parse_mode: "Markdown" }
    );

  } catch (e) {
    console.log("LINK_ACC Error:", e);
  }
});

// ------------------------------
//   OTHER BUTTONS BEFORE LINKED
// ------------------------------
async function requireLink(ctx) {
  return ctx.reply(
    "⚠ Please link your Earning Master app account first.\nClick on *Link Account* to continue.",
    { parse_mode: "Markdown" }
  );
}

bot.action("CHECK_BAL", requireLink);
bot.action("REDEEM", requireLink);
bot.action("TRANSFER", requireLink);
bot.action("DAILY", requireLink);
bot.action("SUPPORT", requireLink);

// ------------------------------
//     START TELEGRAM BOT
// ------------------------------
bot.launch();

// Safe exit on Render stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));