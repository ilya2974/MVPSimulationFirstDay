# Симуляция первого рабочего дня

Веб-приложение Changellenge >> имитирует первый рабочий день: участник регистрируется, попадает в виртуальное рабочее пространство и выполняет задания с помощью почты, текстового редактора, AI-помощника и мессенджера.

План разработки и критерии готовности по дням находятся в [DEVELOPMENT_BACKLOG.md](DEVELOPMENT_BACKLOG.md). Этот файл является источником истины для дальнейших итераций.

Проект собран как pnpm-монорепозиторий. Основное приложение работает на React и Vite, API — на Express.

## Требования

- Node.js 24;
- pnpm 9 или 10;
- macOS или Linux для запуска через готовый shell-скрипт.

Проверить версии:

```bash
node --version
pnpm --version
```

Если `pnpm` не установлен, его можно включить через Corepack, который входит в поставку Node.js:

```bash
corepack enable
corepack install --global pnpm@10
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
- API на `http://localhost:5000`;
- проверку API на `http://localhost:5000/api/healthz`.

Логи сохраняются в файлах:

- `/tmp/mvpsim_front.log` — фронтенд;
- `/tmp/mvpsim_api.log` — API.

> Перед запуском скрипт принудительно завершает процессы, которые занимают порты 3000 и 5000. Если на этих портах работают другие приложения, остановите их самостоятельно или используйте ручной запуск на других портах.

В конце скрипт выводит PID обоих процессов. Чтобы остановить приложение, выполните указанную им команду:

```bash
kill <API_PID> <FRONTEND_PID>
```

## Ручной запуск

Ручной режим удобен для разработки: каждый сервис работает в отдельном терминале, а его вывод виден сразу.

В первом терминале запустите API:

```bash
PORT=5000 DATABASE_URL="postgres://postgres:postgres@localhost:5432/postgres" \
  pnpm --filter @workspace/api-server run dev
```

Во втором терминале запустите интерфейс:

```bash
PORT=3000 BASE_PATH=/ \
  pnpm --filter @workspace/workday-simulation run dev
```

Vite перенаправляет запросы с `/api` на `http://localhost:5000`, поэтому при смене порта API нужно также изменить адрес прокси в `artifacts/workday-simulation/vite.config.ts`.

Основные API-методы хранения:

- `POST /api/register` — создать участника, сессию и начальное состояние;
- `GET /api/state/:participantId` — восстановить состояние симуляции;
- `PATCH /api/state/:participantId` — сохранить отдельный ключ состояния;
- `POST /api/events/:participantId` — записать событие прохождения.

## Переменные окружения

| Переменная | Обязательность | Назначение |
| --- | --- | --- |
| `PORT` | обязательна | Порт сервиса: 5000 для API, 3000 для интерфейса |
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
3. Убедитесь, что порты 3000 и 5000 свободны: `lsof -i :3000 -i :5000`.
4. Посмотрите сообщения в `/tmp/mvpsim_front.log` и `/tmp/mvpsim_api.log`.
5. Проверьте API командой `curl http://localhost:5000/api/healthz`. Исправный сервер вернёт `{"status":"ok"}`.
