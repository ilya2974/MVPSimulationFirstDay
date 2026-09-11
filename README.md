# Симуляция первого рабочего дня

Веб-приложение Changellenge >> имитирует первый рабочий день: участник регистрируется, попадает в виртуальное рабочее пространство и выполняет задания с помощью почты, текстового редактора, AI-помощника и мессенджера.

План разработки и критерии готовности по дням находятся в [DEVELOPMENT_BACKLOG.md](DEVELOPMENT_BACKLOG.md). Этот файл является источником истины для дальнейших итераций.

Проект собран как pnpm-монорепозиторий. Основное приложение работает на React и Vite, API — на Express.

Навигация по логике репозитория и правилам размещения новых файлов находится в [`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md). Дизайн-контракт — в [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).

## Требования

- Node.js 24;
- pnpm 10.28.2 (версия закреплена в `package.json`);
- macOS или Linux для запуска через готовый shell-скрипт.

Проверить версии:

```bash
node --version
pnpm --version
```

Если `pnpm` не установлен, его можно включить через Corepack, который входит в поставку Node.js:

```bash
corepack enable
corepack install --global pnpm@10.28.2
```

## Быстрый запуск

Из корневой папки проекта установите зависимости:

```bash
pnpm install --frozen-lockfile
```

Затем запустите фронтенд и API одной командой:

```bash
./start-project.sh
```

После запуска откройте [http://localhost:3000](http://localhost:3000).

Скрипт запускает:

- интерфейс на `http://localhost:3000`;
- API на `http://localhost:5050`;
- проверку API на `http://localhost:5050/api/healthz`.

Логи сохраняются в файлах:

- `/tmp/mvpsim_front.log` — фронтенд;
- `/tmp/mvpsim_api.log` — API.

> Перед запуском скрипт завершает процессы проекта, которые занимают порты 3000 и 5050. Порт 5000 намеренно не используется: в macOS его часто занимает системный `ControlCenter`.

В конце скрипт выводит PID обоих процессов. Чтобы остановить приложение, выполните указанную им команду:

```bash
kill <API_PID> <FRONTEND_PID>
```

## Ручной запуск

Ручной режим удобен для разработки: каждый сервис работает в отдельном терминале, а его вывод виден сразу.

В первом терминале запустите API:

```bash
PORT=5050 DATABASE_URL="postgres://postgres:postgres@localhost:5432/postgres" \
  pnpm --filter @workspace/api-server run dev
```

Во втором терминале запустите интерфейс:

```bash
PORT=3000 BASE_PATH=/ \
  pnpm --filter @workspace/workday-simulation run dev
```

Vite перенаправляет запросы с `/api` на `http://localhost:5050`. При запуске через `start-project.sh` адрес прокси настраивается автоматически через `API_PROXY_TARGET`.

Основные API-методы хранения:

- `POST /api/register` — создать участника, сессию и начальное состояние;
- `GET /api/state/:participantId` — восстановить состояние симуляции;
- `PATCH /api/state/:participantId` — сохранить отдельный ключ состояния;
- `POST /api/events/:participantId` — записать событие прохождения.

## Переменные окружения

| Переменная | Обязательность | Назначение |
| --- | --- | --- |
| `PORT` | обязательна | Порт конкретного сервиса: 5050 для API, 3000 для интерфейса |
| `API_PORT` | необязательна | Порт API для `start-project.sh`, по умолчанию 5050 |
| `FRONTEND_PORT` | необязательна | Порт интерфейса для `start-project.sh`, по умолчанию 3000 |
| `API_PROXY_TARGET` | необязательна | Адрес API для Vite-прокси, по умолчанию `http://localhost:5050` |
| `BASE_PATH` | обязательна для интерфейса | Базовый URL приложения; для локального запуска — `/` |
| `DATABASE_URL` | обязательна для API | Строка подключения к PostgreSQL |
| `LOG_LEVEL` | необязательна | Уровень логирования API, по умолчанию `info` |

Не добавляйте строку подключения и другие секреты в Git. Для запуска с внешней БД задайте `DATABASE_URL` перед `./start-project.sh`.

## Полезные команды

```bash
# Проверить типы во всём монорепозитории
pnpm run typecheck

# Запустить интеграционные тесты PostgreSQL
TEST_DATABASE_URL="postgres://..." pnpm --filter @workspace/api-server test

# Проверить типы и собрать все пакеты
pnpm run build

# Пересоздать API-клиент и Zod-схемы из OpenAPI
pnpm --filter @workspace/api-spec run codegen

# Применить схему Drizzle к PostgreSQL
DATABASE_URL="postgres://..." pnpm --filter @workspace/db run push
```

Интеграционные тесты требуют уже созданной схемы PostgreSQL. Они выполняют реальные HTTP-запросы к API, проверяют записи в таблицах и удаляют тестовые данные после каждого сценария. Для безопасности лучше использовать отдельную тестовую базу через `TEST_DATABASE_URL`.

## Структура проекта

- `artifacts/workday-simulation` — основной React-интерфейс;
- `artifacts/api-server` — Express API;
- `artifacts/mockup-sandbox` — отдельная песочница макетов, не нужна для запуска основного приложения;
- `lib/api-spec` — OpenAPI-описание;
- `lib/api-client-react` — сгенерированный клиент API;
- `lib/api-zod` — сгенерированные Zod-схемы;
- `lib/db` — слой PostgreSQL и Drizzle;
- `start-project.sh` — локальный запуск фронтенда и API.

## Если приложение не запускается

1. Проверьте, что команды выполняются из корня репозитория.
2. Повторно установите зависимости командой `pnpm install --frozen-lockfile`.
3. Убедитесь, что порты 3000 и 5050 свободны: `lsof -i :3000 -i :5050`.
4. Посмотрите сообщения в `/tmp/mvpsim_front.log` и `/tmp/mvpsim_api.log`.
5. Проверьте API командой `curl http://localhost:5050/api/healthz`. Исправный сервер вернёт `{"status":"ok"}`.

## Production deployment on Render (one public URL)

The repository includes `render.yaml` for one Node web service and one private
PostgreSQL database. Express serves `artifacts/workday-simulation/dist/public`
in production and keeps `/api` reserved for the API. Frontend routes such as
`/register` and `/workspace` support direct navigation and refresh. The mockup
sandbox is built by the workspace build but is not published by Express.

Use Node.js 24 and the pinned pnpm 10.28.2 (`corepack pnpm` uses the version in
`package.json`). No Replit account, connector, or development server is needed.
The existing `./start-project.sh` and separate API/Vite development commands
continue to work. Vite now defaults to `/` and local ports when not specified.

### Deploy the branch

1. Push the prepared branch to GitHub from the repository root:
   ```bash
   git push -u origin deploy/render
   ```
   This does not merge anything into `main`.
2. Sign in to [Render](https://dashboard.render.com/), choose **New → Blueprint**,
   connect GitHub, and select `ilya2974/MVPSimulationFirstDay`.
3. Select branch **deploy/render** and Blueprint path **render.yaml**. Keep the
   repository root as the service root directory; do not select an artifact
   subdirectory because the build needs the entire pnpm workspace.
4. Review the resources and cost. This Blueprint provisions paid compute:
   web `0.5c-512mb`, PostgreSQL `0.1c-256mb` with 1 GB storage. The web service
   uses a pre-deploy migration command, which requires a paid service. See
   [Render's deployment steps](https://render.com/docs/deploys) and
   [Blueprint configuration](https://render.com/docs/blueprint-spec).
5. Enter `OPENROUTER_API_KEY` in Render's secret field and create the Blueprint.
   `DATABASE_URL` is connected automatically using the database's internal URL.
   The new database is empty; existing local or external data is not copied.
6. Wait for build, pre-deploy migrations, and the health check to succeed.
   Open the web service's assigned **https://…onrender.com** URL. That is the
   single public URL to share; the actual hostname is assigned by Render.
7. Verify `/api/healthz` returns `{"status":"ok"}`, open `/register` directly,
   refresh `/workspace`, and complete a registration plus an AI conversation.
   An unknown `/api/...` URL must return JSON with HTTP 404, not the frontend.

Render follows `deploy/render`; subsequent pushes deploy that branch. Switch
Render to `main` only after an approved merge. No merge is needed to deploy.

### Exact service commands

**Build command** (includes development dependencies needed by Vite/TypeScript):

```bash
corepack pnpm install --frozen-lockfile --prod=false && corepack pnpm run build
```

**Pre-deploy command**:

```bash
corepack pnpm run db:migrate
```

**Start command**:

```bash
corepack pnpm start
```

**Health check path**: `/api/healthz`. It checks HTTP availability; registration
is the end-to-end database check. Express listens on `0.0.0.0` using Render's
`PORT`; do not hardcode or configure a frontend production port.

For manual setup instead of a Blueprint, create PostgreSQL and a Node web
service in the same region, choose the paid web plan, set the commands above,
select `deploy/render`, and configure the environment below.

### Render environment variables

| Variable | Configuration |
| --- | --- |
| `NODE_ENV` | `production`, set by the Blueprint and production start script. |
| `DATABASE_URL` | Required secret. Blueprint supplies the private PostgreSQL connection string. For manual setup, use the database's Internal Database URL. |
| `OPENROUTER_API_KEY` | Secret entered in Render. Required for live model replies; without it, the existing local fallback responses remain active. |
| `PORT` | Supplied by Render automatically; leave it unset in your configuration. |
| `OPENROUTER_MODEL` | Optional; existing default `google/gemma-4-31b-it:free`. |
| `OPENROUTER_FALLBACK_MODEL` | Optional; default `openrouter/free`. |
| `OPENROUTER_SITE_URL` | Optional; automatically falls back to Render's `RENDER_EXTERNAL_URL`. Set to your public URL if using a custom domain. |
| `OPENROUTER_APP_NAME` | Optional; default `MVP Simulation`. |
| `LOG_LEVEL` | Optional; default `info`. |

Do not set `BASE_PATH`, `API_PROXY_TARGET`, `API_PORT`, or `FRONTEND_PORT` in
Render. They are local development options. Frontend requests use same-origin
`/api` URLs. Never put secrets in `VITE_*` variables: Vite exposes these to the
browser. `.env` files are ignored by Git; `.env.example` contains placeholders.
The production start script reads the process environment, not a local `.env`.

### Database migrations

The four application tables require initialization before registration works.
The committed initial migration and Drizzle metadata live in `lib/db/migrations`.
`pnpm run db:migrate` applies pending committed migrations transactionally,
records them in Drizzle's migration journal, and safely does nothing on repeat
runs. An advisory lock serializes concurrent migration processes; database
errors fail deployment. No schema is pushed or force-applied during build.

This initial migration targets a **fresh database**. Do not point it at a database
previously initialized with `drizzle-kit push`: it will fail on existing tables
rather than drop or silently rewrite them. To reuse existing data, first back up
that database and plan a reviewed baseline/data migration. Never delete tables
or use `push-force` to fix deployment.

For future schema changes, edit `lib/db/src/schema/index.ts`, run:

```bash
pnpm run db:generate
```

Review the generated SQL and commit it with its metadata. Test it on a disposable
PostgreSQL database before deployment. Prefer backward-compatible migrations
because the old service can still run during pre-deploy. Restoring an old app
build does not undo database migrations; take backups before schema changes.
The existing `push` command remains available for local development only.

### Verify locally before deployment

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run build
pnpm run test:deployment
```

The deployment smoke test starts the actual production bundle on an available
port and checks the SPA, assets, API namespace, and registration validation. It
does not need a database or API key. Test persistence separately with a disposable
database (the tests write and clean up test records):

```bash
DATABASE_URL="postgresql://..." pnpm run db:migrate
DATABASE_URL="postgresql://..." pnpm run db:migrate
TEST_DATABASE_URL="postgresql://..." pnpm --filter @workspace/api-server test
```
