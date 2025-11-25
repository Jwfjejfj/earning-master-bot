// index.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const admin = require('firebase-admin');

const BOT_TOKEN = process.env.BOT_TOKEN;
const FIREBASE_DB_URL = process.env.FIREBASE_DB_URL || null;
const SERVICE_ACCOUNT_PATH = '/etc/secrets/firebase.json'; // Render secret file path

if (!BOT_TOKEN) {
  console.error('Missing BOT_TOKEN in environment.');
  process.exit(1);
}

if (!FIREBASE_DB_URL) {
  console.error('Missing FIREBASE_DB_URL in environment.');
  process.exit(1);
}

// Initialize Firebase Admin
let serviceAccount;
try {
  serviceAccount = require(SERVICE_ACCOUNT_PATH);
} catch (err) {
  console.error('Failed to load firebase.json service account from', SERVICE_ACCOUNT_PATH);
  console.error('Make sure you uploaded firebase.json as a secret file and set FIREBASE_DB_URL env var.');
  console.error(err);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: FIREBASE_DB_URL
});

const db = admin.database();

// Create bot (long polling). If you prefer webhooks, change this to webhook mode.
const bot = new TelegramBot(BOT_TOKEN, {
  polling: {
    interval: 3000,
    autoStart: true,
    params: { timeout: 60 }
  }
});

console.log('Bot started (polling)');

// Utility: generate 6-digit code
function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Check for an existing active code for a telegramId
async function findActiveCodeForTelegramId(telegramId) {
  const snap = await db.ref('verification_codes').orderByChild('telegram_id').equalTo(String(telegramId)).once('value');
  if (!snap.exists()) return null;
  const now = Date.now();
  let found = null;
  snap.forEach(child => {
    const val = child.val();
    if (!val.used && val.expiresAt && val.expiresAt > now) {
      found = { code: child.key, ...val };
    }
  });
  return found;
}

// Create code entry and return it
async function createCode(telegramId) {
  // If already has active code, return that instead
  const active = await findActiveCodeForTelegramId(telegramId);
  if (active) return active;

  const code = genCode();
  const expiresAt = Date.now() + 300_000; // 300 seconds
  await db.ref(`verification_codes/${code}`).set({
    telegram_id: String(telegramId),
    expiresAt,
    used: false,
    createdAt: Date.now()
  });
  return { code, telegram_id: String(telegramId), expiresAt, used: false };
}

// Handle /start
bot.onText(/^\/start$/, async (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from && (msg.from.first_name || msg.from.username || 'there');
  const welcome = `👋 Hey ${name}, And Welcome To Earning Master Official Bot\n\nHere You Can Easily Earn Money, Get Daily Bonus, And Use Giveaway Redeem Codes 🎁`;
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '💰 Check Balance', callback_data: 'check_balance' }, { text: '🔗 Link Account', callback_data: 'link_account' }],
        [{ text: '🎁 Redeem Code', callback_data: 'redeem_code' }, { text: '📤 Transfer Balance', callback_data: 'transfer_balance' }],
        [{ text: '📅 Daily Points', callback_data: 'daily_points' }, { text: '☎️ Support', callback_data: 'support' }]
      ]
    }
  };
  await bot.sendMessage(chatId, welcome, keyboard).catch(e => console.error('sendMessage /start error', e));
});

// Callback query handler (inline buttons)
bot.on('callback_query', async (cq) => {
  const chatId = cq.message.chat.id;
  const data = cq.data;
  try {
    if (data === 'link_account') {
      // Generate or return existing active code
      const existing = await findActiveCodeForTelegramId(chatId);
      if (existing) {
        const remaining = Math.max(0, Math.floor((existing.expiresAt - Date.now()) / 1000));
        await bot.answerCallbackQuery(cq.id, { text: `You already have an active code: ${existing.code}\nExpires in ${remaining} seconds.`});
        return;
      }

      const entry = await createCode(chatId);
      await bot.answerCallbackQuery(cq.id, { text: 'Verification code generated and sent.' });
      const codeMsg = `✅ Your Verification Code: *${entry.code}*\n\n⏳ Expires in 300 seconds\n⚠️ Do NOT share this with anyone.`;
      await bot.sendMessage(chatId, codeMsg, { parse_mode: 'Markdown' });
      return;
    }

    // stub handlers for other buttons
    if (data === 'check_balance') {
      await bot.answerCallbackQuery(cq.id);
      await bot.sendMessage(chatId, 'To check balance, link your account first (press Link Account).');
      return;
    }

    // Add other callback_data handlers as needed...
    await bot.answerCallbackQuery(cq.id, { text: 'Button received' });

  } catch (err) {
    console.error('callback_query error', err);
    try { await bot.answerCallbackQuery(cq.id, { text: 'Internal error' }); } catch(e){}
  }
});

// Listen for link_confirmations uploaded by your app when user verifies code in-app
// Your app should write: /link_confirmations/<telegram_id> = { uid: '1234567', telegram_id: '50714...', action: 'linked' }
db.ref('link_confirmations').on('child_added', async (snap) => {
  try {
    const key = snap.key;
    const val = snap.val();
    if (!val) return;
    const telegramId = val.telegram_id;
    const uid = val.uid;
    const action = val.action || 'linked';
    if (!telegramId || !uid) return;

    if (action === 'linked') {
      // send message to user
      const text = `🔗 Your Earning Master application account *${uid}* is now successfully linked with this Telegram Bot.\n\nYou can now use bot buttons to interact. ✅`;
      await bot.sendMessage(String(telegramId), text, { parse_mode: 'Markdown' });
      // optionally remove confirmation node (cleanup)
      await db.ref(`link_confirmations/${key}`).remove();
      // optionally mark verification code used if one exists
      // (if your app wrote which code was used, mark that code used)
      if (val.code) {
        await db.ref(`verification_codes/${val.code}`).update({ used: true });
      }
    } else if (action === 'unlinked') {
      await bot.sendMessage(String(telegramId), '🔌 Your account has been disconnected. If this was not you, contact support.');
      await db.ref(`link_confirmations/${key}`).remove();
    }
  } catch (err) {
    console.error('link_confirmations handler error', err);
  }
});

// Also delete expired verification_codes periodically (simple cleanup)
setInterval(async () => {
  try {
    const snap = await db.ref('verification_codes').once('value');
    const now = Date.now();
    const updates = {};
    snap.forEach(child => {
      const v = child.val();
      if (!v) return;
      if (v.expiresAt && v.expiresAt <= now && !v.used) {
        updates[child.key + '/expired'] = true;
      }
    });
    if (Object.keys(updates).length) {
      await db.ref('verification_codes').update(updates);
    }
  } catch (err) {
    console.error('cleanup error', err);
  }
}, 60_000);

// Generic error handlers
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});