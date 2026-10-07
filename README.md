# KHAN-MD

KHAN-MD is a WhatsApp bot built with Baileys. It replies to one-to-one chats
only; groups, status updates, and newsletters are ignored. It answers `hey` or
`hesy` with a time-appropriate greeting, and uses the OpenAI API for other
messages when an API key is configured.

AI replies use a casual, friendly voice with occasional Shona phrases. The bot
keeps up to six recent message-and-reply turns per chat in memory while it is
running. It does not save that chat history to disk, and the history is cleared
when the process restarts. Message text is sent to OpenAI to generate AI
replies; API requests use `store: false`.

## Run it

Use Node.js 20 or later.

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `PHONE_NUMBER` to the WhatsApp number
   to link, including country code and digits only. For example, a Zimbabwe
   number starts with `263`.
3. Add your OpenAI API key to `OPENAI_API_KEY` in `.env` if you want AI replies.
   Keep the key private and do not commit `.env`.
4. Run `npm start`.
5. Copy the pairing code from the terminal and enter it in WhatsApp under
   **Linked devices → Link with phone number**.

On Windows PowerShell, use `npm.cmd install` and `npm.cmd start` if PowerShell
blocks `npm.ps1`.

The session is saved in `auth_info/`. Keep that folder private and preserve it
between restarts. Do not commit the session or share the pairing code. The bot
can reply 24/7 only while its process is running on a computer or hosting
service that stays online.

## Settings

- `AUTO_REPLY=true` enables replies in private chats. Set it to `false` to
  disable automatic replies; `.ping` and `.help` still work.
- `OPENAI_API_KEY` enables AI answers. Without it, greeting replies still work,
  while other messages are ignored.
- `OPENAI_MODEL` selects the OpenAI model (default `gpt-6-luna`).
- `TIME_ZONE` controls greeting dayparts (default `Africa/Harare`). For example,
  a greeting is “Hie, good morning, what's up?” in the morning and switches to
  “good afternoon” after midday.
- `PREFIX` changes the default command prefix (`.`).
- `PORT` changes the health server port (default `9090`).

The `/healthz` route returns HTTP 200 when WhatsApp is connected and HTTP 503
while it is starting or disconnected.

## Commands

- `.ping` checks that the bot can reply.
- `.help` lists the available commands.

This is a clean starting point, not a restoration of the old feature set. The
previous repository history used a loader that downloaded and executed code
from another repository, so that loader was not carried forward.
