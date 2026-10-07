import 'dotenv/config';
import express from 'express';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import { isPrivateChat } from './src/message-routing.js';

const port = Number(process.env.PORT || 9090);
const prefix = process.env.PREFIX || '.';
const authDirectory = process.env.AUTH_DIR || './auth_info';
const phoneNumber = (process.env.PHONE_NUMBER || '').replace(/\D/g, '');
const autoReplyEnabled = (process.env.AUTO_REPLY || 'true').toLowerCase() === 'true';
const autoReplyMessage =
  process.env.AUTO_REPLY_MESSAGE ||
  'Thanks for your message! I’ll get back to you as soon as I can.';
const configuredCooldownHours = Number(process.env.AUTO_REPLY_COOLDOWN_HOURS || 24);
const autoReplyCooldownMs =
  (Number.isFinite(configuredCooldownHours)
    ? Math.min(168, Math.max(1, configuredCooldownHours))
    : 24) * 60 * 60 * 1000;

let connected = false;
let reconnectTimer;
let pairingCodeRequested = false;
const autoReplySentAt = new Map();

const app = express();
app.get('/', (_request, response) => {
  response.json({ app: 'KHAN-MD', status: connected ? 'online' : 'starting' });
});
app.get('/healthz', (_request, response) => {
  response.status(connected ? 200 : 503).json({
    app: 'KHAN-MD',
    status: connected ? 'online' : 'starting',
  });
});
app.listen(port, '0.0.0.0', () => {
  console.log('KHAN-MD health server listening on port ' + port);
});

function getMessageText(message) {
  const content = message.message;
  return (
    content?.conversation ||
    content?.extendedTextMessage?.text ||
    content?.imageMessage?.caption ||
    content?.videoMessage?.caption ||
    ''
  ).trim();
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = undefined;
    try {
      await startBot();
    } catch (error) {
      console.error('Reconnect failed:', error.message);
      scheduleReconnect();
    }
  }, 5000);
}

async function handleMessages(sock, event) {
  if (event.type !== 'notify') return;

  for (const message of event.messages) {
    const chat = message.key.remoteJid;
    if (!chat || message.key.fromMe || !isPrivateChat(chat)) continue;

    const text = getMessageText(message);
    if (text.startsWith(prefix)) {
      const [command] = text.slice(prefix.length).trim().split(/\s+/);
      const name = (command || '').toLowerCase();
      let reply;

      if (name === 'ping') {
        reply = 'Pong! KHAN-MD is online.';
      } else if (name === 'help') {
        reply = [
          '*KHAN-MD commands*',
          prefix + 'ping — check whether the bot is online',
          prefix + 'help — show this command list',
        ].join('\n');
      }

      if (reply) {
        await sock.sendMessage(chat, { text: reply }, { quoted: message });
        continue;
      }
    }

    if (!autoReplyEnabled) continue;

    const now = Date.now();
    const lastReplyAt = autoReplySentAt.get(chat) || 0;
    if (now - lastReplyAt < autoReplyCooldownMs) continue;

    autoReplySentAt.set(chat, now);
    try {
      await sock.sendMessage(
        chat,
        { text: autoReplyMessage },
        { quoted: message },
      );
    } catch (error) {
      if (autoReplySentAt.get(chat) === now) autoReplySentAt.delete(chat);
      throw error;
    }
  }
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(authDirectory);
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: process.env.LOG_LEVEL || 'warn' }),
    printQRInTerminal: false,
    markOnlineOnConnect: false,
  });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('messages.upsert', (event) => {
    handleMessages(sock, event).catch((error) => {
      console.error('Could not handle incoming message:', error.message);
    });
  });

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      connected = true;
      console.log('KHAN-MD connected to WhatsApp.');
    }

    if (connection !== 'close') return;

    connected = false;
    const statusCode = lastDisconnect?.error?.output?.statusCode;
    if (statusCode === DisconnectReason.loggedOut) {
      console.error(
        'WhatsApp logged this session out. Remove ' + authDirectory + ', set PHONE_NUMBER, and restart to pair again.',
      );
      return;
    }

    console.warn('WhatsApp connection closed; reconnecting in 5 seconds.');
    scheduleReconnect();
  });

  if (!state.creds.registered && phoneNumber && !pairingCodeRequested) {
    if (phoneNumber.length < 8 || phoneNumber.length > 15) {
      throw new Error('PHONE_NUMBER must include the country code and contain 8–15 digits.');
    }
    pairingCodeRequested = true;
    const code = await sock.requestPairingCode(phoneNumber);
    console.log('WhatsApp pairing code: ' + code);
    console.log('Enter it in WhatsApp → Linked devices → Link with phone number.');
  } else if (!state.creds.registered && !phoneNumber) {
    console.warn('Set PHONE_NUMBER with country code to receive a WhatsApp pairing code.');
  }
}

startBot().catch((error) => {
  console.error('KHAN-MD could not start:', error.message);
  process.exit(1);
});
