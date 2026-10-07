import test from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateChat } from '../src/message-routing.js';

test('allows individual WhatsApp chats', () => {
  assert.equal(isPrivateChat('263771234567@s.whatsapp.net'), true);
  assert.equal(isPrivateChat('123456789012345@lid'), true);
});

test('blocks groups and broadcast destinations', () => {
  assert.equal(isPrivateChat('120363000000000000@g.us'), false);
  assert.equal(isPrivateChat('status@broadcast'), false);
  assert.equal(isPrivateChat('120363000000000000@newsletter'), false);
});

test('rejects missing or invalid chat identifiers', () => {
  assert.equal(isPrivateChat(''), false);
  assert.equal(isPrivateChat(null), false);
});
