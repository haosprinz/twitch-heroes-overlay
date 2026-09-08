# Twitch Heroes Overlay

Источник правды: **[PLAN.md](./PLAN.md)**. Перед новой работой сверяйся с ним: цель, стек, схема БД, REST, Socket.io, команды чата, текущий этап.

## Что это

Локальное приложение для **одного стримера**: рисованные герои в OBS overlay, патруль, дуэли командой `\duel`, админка внешности, таблица пользователей. Зритель меняет **своего** героя в Twitch Extension. Сообщения чата — Twitch EventSub, UI — Socket.io.

## Три независимых проекта

Общей точки запуска нет. Каждый проект живёт в своей папке и стартует сам.

| Папка | Стек | Запуск | URL |
|---|---|---|---|
| [`backend/`](./backend/) | Node.js, TypeScript, Express, SQLite, Socket.io, Twurple | `npm run dev` | http://localhost:3000 |
| [`frontend/`](./frontend/) | Vue 3, TypeScript, Vuetify 3, Pinia | `npm run dev` | http://localhost:5173 |
| [`extension/`](./extension/) | Vue 3, TypeScript, Vite, Twitch Helper | `npm run dev` | http://localhost:5174 |

Страницы frontend: `/overlay` (OBS), `/admin` (герои любого игрока), `/test`, `/extension` (предпросмотр панели), `/chatters`.

## Жёсткие решения плана

- Один стример, без защиты админки
- Один пользователь = один личный герой (`heroes.user_id`)
- Зритель: `GET/POST/PATCH /api/me/hero` + JWT расширения
- Стример может изменить героя любому на `/admin`
- Новым пользователям — случайная внешность
- Ответы API в формате `{ success, ... }`
- Имена Socket-событий и чат-команд — только из PLAN.md

## Сейчас

Этапы 1–14: рисованные личные герои, патруль, дуэли (`\duel`, `\stats`), админка, панель расширения. Живая проверка: OAuth, чат, `/test`, `/extension`, OBS, Hosted Test на канале. Документация: [README.md](./README.md).
