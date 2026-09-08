# Twitch Heroes Overlay

Рисованные герои пользователей в OBS overlay: патруль, дуэли из чата (`\duel`), облака с текстом, кастомизация внешности.

Полный план: [PLAN.md](./PLAN.md)

Три независимых проекта, **без общей точки запуска**. Backend, frontend и extension стартуют в разных терминалах.

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

### 3. Extension (другой терминал)

```bash
cd extension
npm install
copy .env.example .env
npm run dev
```

http://localhost:5174 — панель. Локальный предпросмотр без Twitch: http://localhost:5173/extension

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
| Предпросмотр расширения | http://localhost:5173/extension |
| Таблица пользователей | http://localhost:5173/chatters |
| Панель расширения | http://localhost:5174 |
| API / Socket.io / EBS | http://localhost:3000 |

## OBS

1. Sources → Add → Browser
2. URL: `http://localhost:5173/overlay`
3. Width: 1920, Height: 1080
4. Shutdown source when not visible: включить
5. Refresh browser when scene becomes active: включить

Фон overlay прозрачный. Герои — рисованные человечки; у каждого свой. Появляются после чата, `\duel` или входа в расширение. Стример правит любого на `/admin`.

## Команды чата

Префикс `\` (не `/`): Twitch перехватывает slash-команды и не отдаёт их в чат. Команды не показываются в оверлее.

- `\duel ник` — вызвать пользователя на дуэль (единственный способ)
- `\stats` — победы и поражения
- `\help` — справка

Если у вас или соперника нет героя, он создаётся со случайной внешностью. Дуэли с панели запускать нельзя.

## Troubleshooting

| Симптом | Что проверить |
|---|---|
| Кнопка входа неактивна | `TWITCH_CLIENT_ID` / `SECRET` в `backend/.env`, перезапуск backend |
| EventSub: disconnected | Повторный вход через Twitch с правами чата |
| Overlay пустой | Напишите в чат, `\duel` или откройте `/extension` |
| Расширение не узнаёт зрителя | Capabilities → Request Identity Link, кнопка «Разрешить» |
| Команды молчат | Авторизация прошла, чат канала тот же, что у OAuth-аккаунта |
| GIF не открывается | Файл должен быть `image/gif`, до 5MB |
| OBS не рисует overlay | URL именно `/overlay`, frontend на :5173, 1920×1080 |
