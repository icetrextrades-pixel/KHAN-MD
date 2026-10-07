# KHAN-MD

KHAN-MD is a small WhatsApp bot built with Baileys. It auto-replies in
one-to-one chats only. It ignores groups, status updates, and newsletters.

The automatic reply is sent once per private chat every 24 hours by default,
so repeated messages from one person do not get repeated replies.

## Run it

Use Node.js 20 or later.

1. Install dependencies with `npm install`.
2. Set `PHONE_NUMBER` to the WhatsApp number to link, including country code
   and digits only. For example, a Zimbabwe number starts with `263`.
3. Run `npm start`.
4. Copy the pairing code from the terminal and enter it in WhatsApp under
   **Linked devices → Link with phone number**.

On Windows PowerShell, use `npm.cmd install` and `npm.cmd start` if PowerShell
blocks `npm.ps1`.

The session is saved in `auth_info/`. Keep that folder private and preserve it
between restarts. Do not commit the session or share the pairing code.

## Settings

- `AUTO_REPLY=true` enables automatic replies in private chats. Set it to
  `false` to disable them.
- `AUTO_REPLY_MESSAGE` changes the reply text.
- `AUTO_REPLY_COOLDOWN_HOURS` sets the per-chat quiet period from 1 to 168
  hours. The default is 24 hours.
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
