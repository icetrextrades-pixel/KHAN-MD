import test from 'node:test';
import assert from 'node:assert/strict';
import {
  greetingReply,
  isGreeting,
  trimChatHistory,
} from '../src/chat-behavior.js';

test('recognizes the requested greetings and punctuation variants', () => {
  assert.equal(isGreeting('hey'), true);
  assert.equal(isGreeting('Hey!'), true);
  assert.equal(isGreeting('heyy'), true);
  assert.equal(isGreeting('hesy'), true);
  assert.equal(isGreeting('hey, what are you doing?'), false);
});

test('uses Africa/Harare dayparts for greeting replies', () => {
  assert.equal(
    greetingReply(new Date('2026-06-01T05:00:00.000Z')),
    "Hie, good morning, what's up?",
  );
  assert.equal(
    greetingReply(new Date('2026-06-01T12:00:00.000Z')),
    "Hie, good afternoon, what's up?",
  );
  assert.equal(
    greetingReply(new Date('2026-06-01T17:00:00.000Z')),
    "Hie, good evening, what's up?",
  );
});

test('keeps only the most recent complete chat turns', () => {
  const history = Array.from({ length: 16 }, (_, index) => ({
    role: index % 2 === 0 ? 'user' : 'assistant',
    content: String(index),
  }));

  assert.deepEqual(
    trimChatHistory(history).map(({ content }) => content),
    ['4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15'],
  );
});
