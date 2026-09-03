# Twitch Heroes Overlay

Источник правды: **[PLAN.md](./PLAN.md)**. Перед новой работой сверяйся с ним: цель, стек, схема БД, REST, Socket.io, команды чата, текущий этап.

## Что это

Локальное приложение для **одного стримера**: герои чаттеров в OBS overlay, админка героев, таблица чаттеров. Сообщения чата приходят через Twitch EventSub, UI обновляется через Socket.io.

## Два независимых проекта

Общей точки запуска нет. Каждый проект живёт в своей папке и стартует сам.

| Папка | Стек | Запуск | URL |
|---|---|---|---|
| [`backend/`](./backend/) | Node.js, TypeScript, Express, SQLite, Socket.io, Twurple | `npm run dev` | http://localhost:3000 |
| [`frontend/`](./frontend/) | Vue 3, TypeScript, Vuetify 3, Pinia | `npm run dev` | http://localhost:5173 |

Страницы frontend: `/overlay` (OBS), `/admin` (герои), `/test` (тестирование), `/chatters` (чаттеры).

## Жёсткие решения плана

- Один стример, без защиты админки
- Гифки хранятся локально в `backend/uploads/gifs/`
- Новым чаттерам назначается случайный герой
- Ответы API в формате `{ success, ... }`
- Имена Socket-событий и чат-команд — только из PLAN.md

## Сейчас

Все этапы плана реализованы. Осталось вручную: авторизоваться через Twitch, проверить чат, `/test` и Browser Source в OBS. Документация: [README.md](./README.md).





