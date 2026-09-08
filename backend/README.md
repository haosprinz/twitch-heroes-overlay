# Twitch Heroes — Backend

Независимый API-сервер на TypeScript (`tsx`). Полный план: [../PLAN.md](../PLAN.md).

Запускается отдельно от frontend. Общей точки запуска нет.

```bash
npm install
copy .env.example .env
npm run dev
```

http://localhost:3000 — REST `/api` (включая `/api/me/hero` для расширения), Socket.io, статика `/uploads/gifs`.

## Twitch OAuth

1. Зарегистрируйте приложение: https://dev.twitch.tv/console
2. OAuth Redirect URL: `http://localhost:3000/api/auth/twitch/callback`
3. Client ID и Client Secret — в `.env`
4. Откройте http://localhost:5173 и нажмите «Авторизоваться через Twitch»

Токены пишутся в таблицу `settings` (`twitch_access_token`, `twitch_refresh_token`) и **не** отдаются через `GET /api/settings`. Refresh делает `@twurple/auth`.

После OAuth backend подписывается на `channel.chat.message` через EventSub WebSocket, пишет сообщения в SQLite и шлёт `new_message` / `connection_status` в Socket.io.


