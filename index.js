import 'dotenv/config';
import express from 'express';
import OpenAI from 'openai';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import { isPrivateChat } from './src/message-routing.js';
import {
  greetingReply,
  isGreeting,
  personaInstructions,
  trimChatHistory,
} from './src/chat-behavior.js';

const port = Number(process.env.PORT || 9090);
const prefix = process.env.PREFIX || '.';
const authDirectory = process.env.AUTH_DIR || './auth_info';
const phoneNumber = (process.env.PHONE_NUMBER || '').replace(/\D/g, '');
const autoReplyEnabled = (process.env.AUTO_REPLY || 'true').toLowerCase() === 'true';
const timeZone = process.env.TIME_ZONE || 'Africa/Harare';
const aiModel = process.env.OPENAI_MODEL || 'gpt-6-luna';
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

let connected = false;
let reconnectTimer;
let pairingCodeRequested = false;
const chatHistories = new Map();
const chatQueues = new Map();
const maxRememberedChats = 500;

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

function rememberChatHistory(chat, history) {
  chatHistories.delete(chat);
  chatHistories.set(chat, trimChatHistory(history));
  while (chatHistories.size > maxRememberedChats) {
    chatHistories.delete(chatHistories.keys().next().value);
  }
}

async function replyToMessage(sock, message, chat) {
  const text = getMessageText(message);
  if (!text) return;

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
      return;
    }
  }

  if (!autoReplyEnabled) return;

  const history = chatHistories.get(chat) || [];
  if (isGreeting(text)) {
    const reply = greetingReply(new Date(), timeZone);
    await sock.sendMessage(chat, { text: reply }, { quoted: message });
    rememberChatHistory(chat, [
      ...history,
      { role: 'user', content: text },
      { role: 'assistant', content: reply },
    ]);
    return;
  }

  if (!openai) return;

  try {
    const response = await openai.responses.create({
      model: aiModel,
      instructions: personaInstructions,
      input: [...history, { role: 'user', content: text }],
      max_output_tokens: 220,
      store: false,
    });
    const reply = response.output_text?.trim();

    if (!reply) throw new Error('The AI returned an empty reply.');

    await sock.sendMessage(chat, { text: reply }, { quoted: message });
    rememberChatHistory(chat, [
      ...history,
      { role: 'user', content: text },
      { role: 'assistant', content: reply },
    ]);
  } catch (error) {
    console.error('AI reply failed:', error.message);
    await sock.sendMessage(
      chat,
      { text: "Eish, I'm having a bit of trouble right now 😅 Try me again in a little while." },
      { quoted: message },
    );
  }
}

function queueChatMessage(chat, task) {
  const previous = chatQueues.get(chat) || Promise.resolve();
  const current = previous.catch(() => {}).then(task);
  chatQueues.set(chat, current);
  return current.finally(() => {
    if (chatQueues.get(chat) === current) chatQueues.delete(chat);
  });
}

async function handleMessages(sock, event) {
  if (event.type !== 'notify') return;

  for (const message of event.messages) {
    const chat = message.key.remoteJid;
    if (!chat || message.key.fromMe || !isPrivateChat(chat)) continue;

    await queueChatMessage(chat, () => replyToMessage(sock, message, chat));
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

if (!openai && autoReplyEnabled) {
  console.warn('OPENAI_API_KEY is not set; AI replies are disabled. Greeting replies still work.');
}
