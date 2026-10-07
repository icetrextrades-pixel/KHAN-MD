export function isGreeting(text) {
  const normalized = String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[.!?,]+$/g, '')
    .trim();

  return /^(?:hey+|hesy)$/.test(normalized);
}

export function greetingReply(date = new Date(), timeZone = 'Africa/Harare') {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(date),
  );

  const daypart =
    hour >= 5 && hour < 12
      ? 'good morning'
      : hour >= 12 && hour < 18
        ? 'good afternoon'
        : 'good evening';

  return `Hie, ${daypart}, what's up?`;
}

export function trimChatHistory(history, maxMessages = 12) {
  const evenLimit = Math.max(2, Math.floor(maxMessages / 2) * 2);
  const recent = history.slice(-evenLimit);
  if (recent[0]?.role === 'assistant') recent.shift();
  if (recent.at(-1)?.role === 'user') recent.pop();
  return recent;
}

export const personaInstructions = `You reply to the user's WhatsApp personal chats in a natural, relaxed version of the user's voice. Use casual, friendly English, with occasional natural Shona phrases when they fit. Keep most replies short and conversational, like a normal WhatsApp chat; use humor and emojis lightly. Be direct, warm, and easy to understand. Match the other person's tone without becoming rude. Do not invent the user's plans, memories, opinions, or personal details. If you do not know something about the user, say so simply or ask them. For serious or sensitive topics, be kind and clear rather than making jokes.`;
