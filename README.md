<img src="https://cdn1.iconfinder.com/data/icons/fs-icons-ubuntu-by-franksouza-/512/wlm_protocol.png" alt="Windows Live Messenger Logo" width="100" height="100">

# [Windows Live Messenger](https://wlm.vercel.app/)

🌐 **Try it here**: [WLM](https://wlm.vercel.app)

---

## About

**MSN Messenger**, later rebranded as **Windows Live Messenger**, was a cross-platform instant messaging client developed by Microsoft. It was first released in 1999 and discontinued in 2013.

This project aims to visually recreate the beloved application of our childhood. It was built as a learning experience and as a tribute to nostalgic users like me. I had so much fun coding it, researching, and recovering original assets to make it as authentic as possible.

I hope you enjoy it as much as I did creating it! 😊

The initial idea was to add "fake" contacts (AI bots) to replicate the MSN experience. For now, I don’t have the time or motivation to develop a real chat application—but who knows, maybe in the future!

As a junior developer, I kindly ask for your understanding if the application has bugs or missing features. I’m aware it’s not perfect, and I do my best to fix issues as they come up.

---

## How to Use

To log in, simply enter a random email and password or use Discord authentication. Please note that all data will be lost when you log out.

---

## Available Features

- **Discord Authentication**.
- **Profile customization**: Change your profile picture, display name, and personal message.
- **Status updates**: Set your availability (online, busy, away).
- **Scene customization**: Personalize the application background.
- **Chat with contacts**.
- **Send emoticons**.
- **Send wizz (nudge)**: Relive the iconic MSN feature!
- **Winks**: Add animations to your interactions.

---

## Planned Features

Some features are not yet implemented but are planned for future updates:

- **A proper authentication system**.
- **Real-time chat with other users (non-AI)**.
- **Advanced settings**: More customizable options.
- **Text style customization**: Change font color, size, and type in chat.
- **Customized background for the chat**.
- **Audio and video calls**.
- **Mobile-responsive version**.

---

## Acknowledgments

- [7.css](https://github.com/khang-nd/7.css): For offering a collection of Windows 7-inspired components, which saved me a significant amount of time and effort.

---

## Contribute and Share Feedback

If you’d like to contribute to the project or provide feedback, feel free to reach out. I welcome all suggestions and help to improve this nostalgic trip down memory lane!

### Fotolog

`/fotolog` redirects to the signed-in user's named URL, such as `/fotolog/ana-perez`.
Names are normalized and duplicate URLs receive a numeric suffix. Profile renames
create a new URL while previous URLs and numeric links keep working. Accounts are
still scoped to the same company/event. Includes a daily photo (one
per calendar day in `ADMIN_TIMEZONE`), photo archive/permalinks, guestbook
comments, user search, favorites, and per-profile colors/banner/background.
Uploads accept JPEG, PNG, WebP and GIF files up to 500 KB. Larger still images are compressed in the browser; animated GIFs must already fit the limit. Images and profile
settings persist in PostgreSQL, using the additive tables in `server/schema.sql`
(applied when the API starts). Nginx proxies the Fotolog API endpoints while
keeping profile URLs as frontend routes.

Validate the local API with `FOTOLOG_INTEGRATION=1 node --test server/fotolog.integration.test.js`
after `npm run server:local`. Integration fixtures are removed after the test.

### Win98 hosting

The Windows 98 Web Edition (separate repo `win98-web`) is served on the same domain. Share **`/win98`** — it redirects (302) to the app's canonical path `/win98-web/`, keeping sub-paths and query strings (`/win98/resume` -> `/win98-web/resume`).

**Requirements:** a sibling checkout of win98-web next to this repo (the `win98` compose service builds from `WIN98_CONTEXT`, default `../win98-web`; it can also be a git URL). `win98` has no published port — the only entry is the `web` nginx, and `web` does not depend on it, so MSN stays up even if `win98` is down (`/win98-web/` returns 502 until it recovers).

**Deploy on the EC2 host:**

```bash
git pull                                   # this repo
git -C ../win98-web pull                   # the sibling checkout
git -C ../win98-web rev-parse --short HEAD # record the deployed win98 commit
docker compose build win98                 # build explicitly so a stale checkout is never deployed silently
docker compose up -d --build
scripts/win98-routing/verify.sh http://localhost
```

**Rollback:** `git revert` the nginx/compose change, `docker compose up -d web`, then `docker compose rm -sf win98`.

**Same-origin note:** win98 runs on the same origin as MSN, so its JS can read MSN `localStorage` (`messenger_token`, `messenger_user`). Accepted for internal use; if isolation is ever needed, serve it from a `win98.<domain>` subdomain server block pointing at the same service — no win98 change required.

**Local verification** (stub API, no database, no RDS):

```bash
docker compose -f scripts/win98-routing/docker-compose.verify.yml up -d --build
scripts/win98-routing/verify.sh http://localhost:8081
VERIFY_ISOLATION=1 scripts/win98-routing/verify.sh http://localhost:8081  # also stop/start win98 + port checks
docker compose -f scripts/win98-routing/docker-compose.verify.yml down
```

Production sits behind an AWS ALB that terminates TLS and forwards HTTP to port 80; all redirects are relative (`absolute_redirect off`), so no extra ALB rule or nginx change is needed.
