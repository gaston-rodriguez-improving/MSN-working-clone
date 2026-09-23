# Messenger backend

Self-contained Express + SQLite API for the frontend in the repository. It is intentionally scoped to one configured company/event (`COMPANY_ID` and `EVENT_ID`) and does **not** implement SSO.

## Run

```sh
cd server
cp .env.example .env
# Set a strong JWT_SECRET in .env
npm install
npm start
```

The API listens on `PORT` (default `3001`) and creates `data/messenger.sqlite` automatically. Point the frontend's `VITE_BACKEND_URL` at the API. WebSocket clients connect to `ws://host/ws?token=JWT`.

## Configuration

- `JWT_SECRET`: required in production; signs bearer tokens.
- `ALLOWED_EMAIL_DOMAINS`: optional comma-separated domain allowlist. Empty permits all domains.
- `COMPANY_ID`, `EVENT_ID`: scope all users, conversations, and tokens. Keep these stable for one deployment.
- `CORS_ORIGIN`: comma-separated allowed frontend origins.
- `DATABASE_PATH`: SQLite path, relative to `server/`.

## API

Authentication returns `{ access_token, user }`; protected HTTP routes use `Authorization: Bearer <token>`.

- `POST /auth/sign-up` `{ email, username, password, bio?, avatar?, banner? }`
- `POST /auth/sign-in` `{ email, password }`
- `GET /auth/check-token`
- `GET /users?search=...`
- `POST /conversations` `{ userId }` (idempotent direct conversation)
- `GET /messages/chats`
- `GET /messages/chat/:chatId`
- `POST /messages` `{ chatId, content, drawAttention?, winks? }`
- `POST /unread-messages/reset` `{ chatId }`
- `PATCH /users` `{ avatar?, banner? }`
- `PATCH /users/status` `{ status }`
- `PATCH /users/bio` `{ bio }`
- `PATCH /users/username` `{ username }`

WebSocket JSON events are `{ "type": "message", "payload": { "chatId", "content", "drawAttention?", "winks?" } }`. Persisted messages are broadcast as `message`; profile changes broadcast `user_status_update`, `user_bio_update`, and `user_username_update` with the public user payload. Conversation membership is checked before reads or writes, and messages are committed before broadcast.

## Verification

```sh
npm test
```

The schema is in `schema.sql` and is applied on every startup with safe `IF NOT EXISTS` statements. Passwords are bcrypt-hashed; password hashes are never returned.
