# Twitch Heroes — Extension

Панель на странице канала: зритель авторизуется через Twitch Extension Helper и меняет **своего** героя.

Запускается отдельно от backend и frontend.

```bash
cd extension
npm install
copy .env.example .env
npm run dev
```

http://localhost:5174 — локальный предпросмотр панели (без Twitch Helper уходит в dev-режим).

## Twitch Developer Console

1. https://dev.twitch.tv/console → Extensions → Create Extension
2. Type: **Panel**
3. Capabilities: включить **Request Identity Link**
4. Asset Hosting (Hosted Test):
   - Testing Base URI: `http://localhost:5174`
   - Panel Viewer Path: `index.html`
   - Config Path: `config.html`
   - Panel Height: `500`
5. Extension Client Configuration → скопировать **Extension Secret** (base64) в `backend/.env` как `TWITCH_EXTENSION_SECRET`
6. Перезапустить backend

На канале iframe шлёт JWT в `Authorization: Bearer …` на `GET/POST/PATCH /api/me/hero`. Сервер проверяет подпись секретом расширения и берёт `user_id` только если зритель поделился идентичностью.

Владелец канала меняет любого героя в админке: http://localhost:5173/admin
