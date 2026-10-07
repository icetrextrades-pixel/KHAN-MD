const directChatSuffixes = ['@s.whatsapp.net', '@lid'];

export function isPrivateChat(jid) {
  return (
    typeof jid === 'string' &&
    directChatSuffixes.some((suffix) => jid.endsWith(suffix))
  );
}
