# Twitch Heroes Overlay

Герои чаттеров в OBS overlay: сообщения из Twitch EventSub, облака с текстом, админка GIF-героев.

Полный план: [PLAN.md](./PLAN.md)

Два независимых проекта, **без общей точки запуска**. Backend и frontend стартуют в разных терминалах.

## Быстрый старт

### 1. Backend

```bash
cd backend
npm install
copy .env.example .env
```

В `.env` укажите `TWITCH_CLIENT_ID` и `TWITCH_CLIENT_SECRET`.

```bash
npm run dev
```

http://localhost:3000

### 2. Frontend (другой терминал)

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

http://localhost:5173

## Twitch-приложение

1. [Twitch Developer Console](https://dev.twitch.tv/console) → Register Your Application
2. OAuth Redirect URL: `http://localhost:3000/api/auth/twitch/callback`
3. Client ID и Secret — в `backend/.env`
4. Откройте http://localhost:5173 и нажмите **Авторизоваться через Twitch**
5. Подтвердите права, включая чтение и отправку сообщений в чат

Без этого шага EventSub не подключается, команды в чат не отвечают.

## Страницы

| Что | URL |
|---|---|
| Главная и OAuth | http://localhost:5173 |
| Overlay для OBS | http://localhost:5173/overlay |
| Админка героев | http://localhost:5173/admin |
| Таблица чаттеров | http://localhost:5173/chatters |
| API / Socket.io | http://localhost:3000 |

## OBS

1. Sources → Add → Browser
2. URL: `http://localhost:5173/overlay`
3. Width: 1920, Height: 1080
4. Shutdown source when not visible: включить
5. Refresh browser when scene becomes active: включить

Фон overlay прозрачный. Если OBS ничего не показывает, проверьте, что frontend запущен и в админке есть герои с GIF.

## Команды чата

- `/heroes` — список героев
- `/heroes имя` — выбрать героя
- `/hero` — ваш текущий герой
- `/help` — справка

Новому зрителю без героя назначается случайный.

## Troubleshooting

| Симптом | Что проверить |
|---|---|
| Кнопка входа неактивна | `TWITCH_CLIENT_ID` / `SECRET` в `backend/.env`, перезапуск backend |
| EventSub: disconnected | Повторный вход через Twitch с правами чата |
| Overlay пустой | Добавьте героев с GIF на `/admin` |
| Команды молчат | Авторизация прошла, чат канала тот же, что у OAuth-аккаунта |
| GIF не открывается | Файл должен быть `image/gif`, до 5MB |
| OBS не рисует overlay | URL именно `/overlay`, frontend на :5173, 1920×1080 |
