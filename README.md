# KHAN-MD

KHAN-MD is a small WhatsApp bot built with Baileys. This recovery baseline
connects one WhatsApp account and responds only to `.ping` and `.help`.

## Run it

Use Node.js 20 or later.

1. Install dependencies with `npm install`.
2. Set `PHONE_NUMBER` to the WhatsApp number to link, including country code
   and digits only. For example, a Zimbabwe number starts with `263`.
3. Run `npm start`.
4. Copy the pairing code from the terminal and enter it in WhatsApp under
   **Linked devices → Link with phone number**.

The session is saved in `auth_info/`. Keep that folder private and preserve it
between restarts. Do not commit the session or share the pairing code.

Set `PREFIX` to change the default command prefix (`.`). Set `PORT` to change
the health server port (default `9090`). The `/healthz` route returns HTTP 200
when WhatsApp is connected and HTTP 503 while it is starting or disconnected.

## Commands

- `.ping` checks that the bot can reply.
- `.help` lists the available commands.

This is a clean starting point, not a restoration of the old feature set. The
previous repository history used a loader that downloaded and executed code
from another repository, so that loader was not carried forward.
