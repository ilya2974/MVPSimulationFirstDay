# Дизайн-система First Workday

Этот документ — контракт между дизайном и frontend-разработкой. Визуальные изменения сначала ищутся здесь и в `artifacts/workday-simulation/src/index.css`; бизнес-логика остаётся в `App.tsx`.

## Визуальное направление

Спокойная рабочая среда Changellenge: тёплый бумажный фон, глубокий зелёно-синий текст, мятный primary-цвет и золотой акцент. Интерфейс должен ощущаться как собранный desktop-прототип, а не как маркетинговый лендинг.

## Токены

Основные CSS-переменные находятся в `src/index.css` в блоке `:root`:

| Токен | Назначение |
| --- | --- |
| `--background` | фон публичных экранов |
| `--foreground` | основной текст |
| `--primary` | основные кнопки, активные элементы |
| `--accent` | таймер, прогресс, приоритет |
| `--border` | границы и разделители |
| `--card` | светлые панели |
| `--sidebar` | тёмная системная панель |
| `--app-font-sans` | DM Sans, интерфейс |
| `--app-font-serif` | Instrument Serif, крупные заголовки |
| `--app-font-mono` | IBM Plex Mono, метки и время |

Не добавляйте новые hex-цвета для типовых состояний: сначала используйте токены или существующие классы `.button-primary`, `.button-secondary`, `.paper-panel`, `.toolbar-button`.

## Карта экранов и точка входа

Все маршруты и экранные компоненты собраны в `artifacts/workday-simulation/src/App.tsx`.

| Экран | Route | Компонент | Стили |
| --- | --- | --- | --- |
| Landing | `/` | `Landing` | `.landing-shell`, `.serif`, `.eyebrow` |
| Registration | `/register` | `Register` | `AuthFrame`, `.form-input`, `.button-primary` |
| Instructions | `/instruction` | `Instruction` | `AuthFrame`, `.paper-panel` |
| Desktop | `/workspace` | `Workspace` | `.desktop-stage`, `.desktop-wallpaper`, `.desktop-topbar`, `.desktop-taskbar` |
| Mail | — окно Desktop | `MailApp`, `EmailReading`, `ComposeMail` | `.mail-*`, `.reading-*` |
| Word | — окно Desktop | `WordApp` | `.word-*`, `.window-toolbar` |
| AI Assistant | — окно Desktop | `AiApp` | `.ai-*`, `.chat-*` |
| Messenger | — окно Desktop | `MessengerApp` | `.messenger-*`, `.chat-*` |
| Finish | `/finish` | `Finish` | `.landing-shell`, `.paper-panel` |

## Где менять дизайн

- Общие цвета, шрифты, радиусы, тени и анимации: `src/index.css`, `:root` и верхние базовые классы.
- Публичные страницы и регистрация: `Landing`, `AuthFrame`, `Register`, `Instruction` в `App.tsx`.
- Рабочий стол, окна, taskbar и responsive-поведение: `Workspace`, `WindowFrame`, `DesktopIcon` и блок `.desktop-*` в `index.css`.
- Почта: `MailApp`, `EmailReading`, `ComposeMail` и блоки `.mail-*`, `.reading-*`.
- Документ: `WordApp` и `.word-*`.
- ИИ: `AiApp` и `.ai-*`, `.chat-*`.
- Мессенджер: `MessengerApp` и `.messenger-*`, `.message-line`.

Состояние, API-вызовы и localStorage не следует переносить в CSS-компоненты. Для визуального варианта меняйте markup/classes, сохраняя `data-testid`.

## Иконки

Используется `lucide-react`. Иконки должны импортироваться из `lucide-react`, а не рисоваться вручную SVG.

| Смысл | Иконка |
| --- | --- |
| Почта | `Mail` |
| Документ | `FileText` |
| AI | `Sparkles` |
| Мессенджер | `MessageCircle` |
| Отправка | `Send` |
| Закрытие окна | `X` |
| Свернуть | `Minus` |
| Развернуть | `Square` |
| Назад/вперёд | `ArrowLeft` / `ArrowRight` |
| Успех | `CheckCircle2` |

Размеры: 13–16 px для toolbar и списков, 19–24 px для desktop-иконок. Для новых кнопок обязательно задавайте `aria-label`, если рядом нет видимого текста.

## Состояния компонентов

Нужно сохранять визуальное различие состояний: default, hover, active/selected, disabled, loading, error, success. Для окон используйте существующие `WindowFrame`-состояния `visible`, `minimized`, `maximized`; не создавайте отдельную систему модальных окон.

## Responsive

Desktop-сценарий рассчитан на ширину от 1100 px. При меньшей ширине показывается `.mobile-warning`. Если меняется breakpoint, обновляйте одновременно текст предупреждения и CSS media-query внизу `index.css`.

## Definition of done для дизайн-изменения

1. Изменение внесено в правильный экранный блок и не дублирует токены.
2. Сохранены `data-testid`, keyboard focus и aria-labels.
3. Проверены default/hover/disabled/error состояния.
4. Проверены Desktop ≥1100 px и узкий viewport.
5. Выполнены `pnpm run typecheck` и frontend build.
