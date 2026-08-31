import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  FolderOpen,
  Inbox,
  Info,
  LayoutGrid,
  Mail,
  MessageCircle,
  Minus,
  MoreHorizontal,
  PenLine,
  Play,
  Plus,
  RotateCcw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Square,
  Star,
  Trash2,
  UsersRound,
  Wifi,
  X,
} from 'lucide-react';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

type Profile = { participantId?: string; lastName: string; firstName: string; age: string; email: string };
type AppId = 'mail' | 'word' | 'ai' | 'messenger';
type WindowState = { visible: boolean; minimized: boolean; maximized: boolean; z: number };
type MailFolder = 'inbox' | 'archive' | 'trash' | 'sent';
type MailRecord = { id: string; sender: string; email: string; subject: string; preview: string; date: string; unread: boolean; icon: string; read: boolean; flagged: boolean; folder: MailFolder };
type TaskStatus = 'active' | 'completed' | 'expired' | 'not-started';

const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const value = localStorage.getItem(key);
      return value ? (JSON.parse(value) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* localStorage may be unavailable */ }
  },
};

const appLabels: Record<AppId, string> = {
  mail: 'Почта',
  word: 'Word',
  ai: 'AI-помощник',
  messenger: 'Мессенджер',
};

const mailItems = [
  { id: 'task', sender: 'Марина Орлова', email: 'marina.orlova@changellenge.ru', subject: 'Первая задача', preview: 'Добро пожаловать в команду. Начнем с небольшого исследования...', date: '09:12', unread: true, icon: 'МO' },
  { id: 'survey', sender: 'Команда People', email: 'people@changellenge.ru', subject: 'Результаты опроса новых сотрудников', preview: 'Приложили сводку ответов за последний поток...', date: '08:56', unread: true, icon: 'КP' },
  { id: 'data', sender: 'Олег Власов', email: 'oleg.vlasov@changellenge.ru', subject: 'Доступные данные по продукту', preview: 'Собрал ссылки и источники, которыми можно пользоваться.', date: 'Вчера', unread: true, icon: 'ОВ' },
  { id: 'security', sender: 'IT Security', email: 'security@changellenge.ru', subject: 'Информация по безопасности', preview: 'Коротко о правилах работы с корпоративными данными.', date: 'Вчера', unread: false, icon: 'IS' },
  { id: 'calendar', sender: 'Екатерина Соколова', email: 'ekaterina@changellenge.ru', subject: 'Встреча: знакомство с отделом', preview: 'Поставила встречу в календарь на 11:30.', date: 'Вчера', unread: false, icon: 'ЕС' },
  { id: 'office', sender: 'Office Team', email: 'office@changellenge.ru', subject: 'Офис: карта и доступ', preview: 'Информация о пропуске и рабочих зонах.', date: 'Пн', unread: false, icon: 'OT' },
  { id: 'digest', sender: 'Changellenge News', email: 'news@changellenge.ru', subject: 'Итоги недели в компании', preview: 'Главные новости и короткие заметки команд.', date: 'Пт', unread: false, icon: 'CN' },
  { id: 'benefits', sender: 'People team', email: 'people@changellenge.ru', subject: 'Полезные сервисы для команды', preview: 'Собрали ответы на частые вопросы первого месяца.', date: 'Пт', unread: false, icon: 'PT' },
  { id: 'brief', sender: 'Марина Орлова', email: 'marina.orlova@changellenge.ru', subject: 'Материалы к встрече', preview: 'Несколько документов, которые пригодятся позже.', date: 'Чт', unread: false, icon: 'МO' },
  { id: 'welcome', sender: 'Changellenge', email: 'hello@changellenge.ru', subject: 'Ваш рабочий аккаунт готов', preview: 'Данные для первого входа и полезные ссылки.', date: 'Чт', unread: false, icon: 'CH' },
];

function getInitialMailRecords(): MailRecord[] {
  const readIds = storage.get<string[]>('workday-mail-read', []);
  return mailItems.map((mail) => ({
    ...mail,
    read: readIds.includes(mail.id) || !mail.unread,
    flagged: mail.id === 'task',
    folder: 'inbox',
  }));
}

const taskActions = [
  'Прочитать все сообщения от коллег и ответить.',
  'Проверить, какая информация доступна для анализа, ее полноту и ограничения.',
  'Написать промт для ИИ, чтобы он придумал концепцию ИИ-помощника.',
  'Изучить существующие на рынке ИИ-помощники для адаптации сотрудников.',
  'Проанализировать письма и определить потребности разных целевых аудиторий с помощью ИИ.',
  'Подготовить обоснование для руководителя выбора целевой аудитории и ее потребностей.',
  'Построить карту пути новичка от получения оффера до окончания испытательного срока.',
  'Определить ключевой функционал.',
  'Описать преимущества предложения.',
  'Описать риски решения.',
  'Проверить ограничения и при необходимости внести изменения в предложение.',
  'Отправить предложение руководителю.',
  'Составить портрет новичка для каждой целевой аудитории.',
  'Изучить задачу от руководителя и определить, какой результат нужно подготовить к встрече.',
  'Написать руководителю промежуточный статус.',
  'Запросить у коллег недостающую для анализа и принятия решения информацию.',
  'Уточнить у руководителя его ожидания от ИИ-помощника.',
  'Сформулировать цели проекта ИИ-помощника для адаптации и критерии оценки эффективности проекта.',
  'Изучить правила работы с корпоративным ИИ.',
  'Прочитать документ с информацией о потребностях и проблемах целевых аудиторий, выделить потребности, повторяющиеся запросы, противоречия и недостающую информацию.',
];

function getProfile() {
  return storage.get<Profile>('workday-profile', { lastName: '', firstName: '', age: '', email: '' });
}

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function AppMark({ small = false }: { small?: boolean }) {
  return <span className={small ? 'inline-flex items-center justify-center rounded-md bg-[#39746a] p-1.5 text-[#f6f2e7]' : 'inline-flex items-center justify-center rounded-lg bg-[#39746a] p-2 text-[#f6f2e7]'}><BriefcaseBusiness size={small ? 15 : 21} strokeWidth={1.8} /></span>;
}

function PublicHeader() {
  const [, setLocation] = useLocation();
  return (
    <header className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-6 py-6 md:px-10">
      <button data-testid="button-brand-home" onClick={() => setLocation('/')} className="flex items-center gap-3 text-left">
        <AppMark small />
        <span className="text-sm font-semibold tracking-[-0.02em] text-[#263d41]">Changellenge <span className="font-normal text-[#8b958d]">/ first workday</span></span>
      </button>
      <div className="hidden items-center gap-5 text-xs text-[#7c8780] md:flex">
        <span>45 минут</span><span className="h-1 w-1 rounded-full bg-[#c6a16b]" /><span>5 заданий</span><span className="h-1 w-1 rounded-full bg-[#c6a16b]" />
        <span>практика, не теория</span>
      </div>
    </header>
  );
}

function Landing() {
  const [, setLocation] = useLocation();
  return (
    <main className="landing-shell">
      <PublicHeader />
      <section className="mx-auto grid min-h-[640px] w-full max-w-[1180px] items-center gap-12 px-6 pb-14 pt-8 md:grid-cols-[1.08fr_.92fr] md:px-10 md:pt-14">
        <div className="animate-rise">
          <div className="eyebrow mb-7">Changellenge &gt;&gt; / практическая диагностика</div>
          <h1 className="serif max-w-[650px] text-[clamp(58px,8vw,104px)] leading-[.88] tracking-[-.045em] text-[#243d40]">Проверьте себя<br /><em className="text-[#39746a]">в деле.</em></h1>
          <p className="mt-8 max-w-[445px] text-[16px] leading-7 text-[#63716c]">Тест-симуляция первого рабочего дня от Changellenge &gt;&gt;. Войдите в рабочую среду, разберитесь с задачами и покажите, как вы принимаете решения.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <button data-testid="button-start-simulation" onClick={() => setLocation('/register')} className="button-primary">Начать симуляцию <ArrowRight size={16} /></button>
            <button data-testid="button-about-simulation" onClick={() => document.getElementById('about-simulation')?.scrollIntoView({ behavior: 'smooth' })} className="button-secondary">Как это устроено <ChevronDown size={15} /></button>
          </div>
          <div className="mt-14 flex items-center gap-3 text-xs text-[#8a928d]"><ShieldCheck size={16} className="text-[#39746a]" /> Это не тест на скорость. Важен ход ваших мыслей.</div>
        </div>
        <div className="relative animate-rise delay-2">
          <div className="absolute -right-4 -top-8 h-24 w-24 rounded-full border border-[#c6a16b]/40" />
          <div className="relative overflow-hidden rounded-[18px] border border-[#d5d2c5] bg-[#e7e7dc] p-4 shadow-[0_24px_55px_rgba(40,56,55,.16)]">
            <div className="flex items-center justify-between border-b border-[#cfd1c8] pb-3"><div className="flex gap-1.5"><i className="h-2 w-2 rounded-full bg-[#c98e70]" /><i className="h-2 w-2 rounded-full bg-[#d4ba7e]" /><i className="h-2 w-2 rounded-full bg-[#83a599]" /></div><span className="font-mono text-[9px] uppercase tracking-widest text-[#81908a]">employee / desktop</span></div>
            <div className="mt-4 grid grid-cols-[82px_1fr] gap-4">
              <div className="space-y-3 pt-2">{['Почта', 'Word', 'AI', 'Чаты', 'Файлы'].map((item, index) => <div key={item} className="flex flex-col items-center gap-1.5 text-[9px] text-[#5e716c]"><span className={`grid h-8 w-8 place-items-center rounded-lg ${index === 0 ? 'bg-[#39746a] text-[#f3f4eb]' : 'bg-[#d2ddd5] text-[#648078]'}`}>{index === 0 ? <Mail size={14} /> : index === 1 ? <FileText size={14} /> : index === 2 ? <Sparkles size={14} /> : index === 3 ? <MessageCircle size={14} /> : <FolderOpen size={14} />}</span>{item}</div>)}</div>
              <div className="overflow-hidden rounded-lg border border-[#ced7ce] bg-[#f8f8f2]"><div className="flex items-center justify-between border-b border-[#dce1d9] bg-[#edf1eb] px-3 py-2"><span className="text-[10px] font-semibold text-[#435a58]">Почта</span><span className="font-mono text-[8px] text-[#96a09a]">10 сообщений</span></div><div className="p-3"><div className="rounded-md bg-[#dce9e1] p-2.5"><div className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#39746a] font-mono text-[8px] text-white">MO</span><div><div className="text-[10px] font-semibold text-[#3e5653]">Марина Орлова</div><div className="text-[8px] text-[#82908a]">Первая задача · 09:12</div></div></div><p className="mt-2 text-[9px] leading-4 text-[#60716b]">Добро пожаловать в команду. Начнем с небольшого исследования...</p></div>{['Результаты опроса новых сотрудников','Доступные данные по продукту','Информация по безопасности'].map((label, i) => <div key={label} className="border-b border-[#e4e7e0] py-3 text-[9px] text-[#65736e]"><span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[#c6a16b]" />{label}<span className="float-right font-mono text-[8px] text-[#a0aaa3]">{i === 0 ? '08:56' : 'вчера'}</span></div>)}</div></div>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-md bg-[#263f43] px-3 py-2 text-[9px] text-[#d5e1d8]"><span>Задание 01 / входящие</span><span className="font-mono text-[#e8c98e]">45:00</span></div>
          </div>
          <div className="absolute -bottom-7 -left-7 hidden w-48 rounded-lg border border-[#d7d1c1] bg-[#fbf9f1] p-3 shadow-[0_14px_28px_rgba(40,56,55,.12)] md:block"><div className="eyebrow mb-2 !text-[8px]">режим наблюдения</div><div className="flex items-center gap-2 text-xs text-[#5d6d68]"><CheckCircle2 size={15} className="text-[#39746a]" /> реальные рабочие сценарии</div></div>
        </div>
      </section>
      <section id="about-simulation" className="mx-auto grid w-full max-w-[1180px] gap-10 border-t border-[#d9d3c5] px-6 py-20 md:grid-cols-[.8fr_1.2fr] md:px-10">
        <div><div className="eyebrow mb-4">01 / формат</div><h2 className="serif text-5xl leading-none text-[#294447]">Рабочий день,<br /><em>сжатый до сути.</em></h2></div>
        <div className="grid gap-7 md:grid-cols-3">{[['45', 'минут', 'Чтобы пройти пять последовательных ситуаций.'], ['07', 'окон', 'Почта, документ, данные и разговоры — все как в жизни.'], ['01', 'профиль', 'Сценарий под роль молодого специалиста.']].map(([num, unit, copy]) => <div key={num} className="border-t border-[#b9c7bc] pt-4"><div className="font-mono text-3xl text-[#39746a]">{num}<span className="ml-1 text-base text-[#a8b1a7]">{unit}</span></div><p className="mt-3 text-xs leading-5 text-[#68756f]">{copy}</p></div>)}</div>
      </section>
      <footer className="mx-auto flex w-full max-w-[1180px] items-center justify-between border-t border-[#d9d3c5] px-6 py-7 text-[10px] text-[#89918b] md:px-10"><span>Changellenge &gt;&gt; first workday simulation</span><span>Личная среда · без внешних сервисов</span></footer>
    </main>
  );
}

function AuthFrame({ step, children }: { step: number; children: ReactNode }) {
  return (
    <main className="landing-shell min-h-[100dvh]">
      <PublicHeader />
      <div className="mx-auto grid w-full max-w-[1050px] gap-12 px-6 pb-20 pt-10 md:grid-cols-[.72fr_1.28fr] md:px-10 md:pt-20">
        <div className="animate-rise pt-3"><div className="eyebrow mb-5">первый рабочий день / 0{step} из 03</div><div className="progress-dots mb-8"><i className={step >= 1 ? 'active' : ''} /><i className={step >= 2 ? 'active' : ''} /><i className={step >= 3 ? 'active' : ''} /></div><h1 className="serif max-w-[340px] text-6xl leading-[.9] tracking-[-.04em] text-[#294447]">{step === 1 ? <>Сначала<br /><em>познакомимся.</em></> : step === 2 ? <>Теперь<br /><em>разберемся.</em></> : <>Готовы<br /><em>войти?</em></>}</h1><p className="mt-7 max-w-[310px] text-sm leading-6 text-[#6c7973]">{step === 1 ? 'Несколько деталей — и мы соберем для вас личную рабочую среду.' : 'Дальше вы окажетесь внутри виртуального рабочего места.'}</p></div>
        <div className="paper-panel animate-rise delay-1 p-7 md:p-10">{children}</div>
      </div>
    </main>
  );
}

function Register() {
  const [, setLocation] = useLocation();
  const existing = getProfile();
  const [form, setForm] = useState<Profile>(existing);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const update = (key: keyof Profile) => (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, consent }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.participantId) throw new Error('registration_failed');
      storage.set('workday-profile', { ...form, participantId: result.participantId });
      setLocation('/instruction');
    } catch {
      setError('Не удалось завершить регистрацию. Попробуйте еще раз.');
    } finally {
      setSubmitting(false);
    }
  };
  return <AuthFrame step={1}><div className="eyebrow mb-3">ваш профиль</div><h2 className="serif text-4xl text-[#294447]">Короткая анкета</h2><p className="mt-3 max-w-[430px] text-sm leading-6 text-[#6e7b75]">Имя появится внутри симуляции — в письмах, чате и рабочем профиле.</p><form onSubmit={submit} className="mt-8 grid gap-5"><div className="grid gap-5 sm:grid-cols-2"><label><span className="field-label">Фамилия</span><input data-testid="input-last-name" required value={form.lastName} onChange={update('lastName')} className="form-input" placeholder="Орлова" /></label><label><span className="field-label">Имя</span><input data-testid="input-first-name" required value={form.firstName} onChange={update('firstName')} className="form-input" placeholder="Мария" /></label></div><div className="grid gap-5 sm:grid-cols-2"><label><span className="field-label">Возраст</span><input data-testid="input-age" required type="number" min="16" max="75" value={form.age} onChange={update('age')} className="form-input" placeholder="24" /></label><label><span className="field-label">Адрес электронной почты</span><input data-testid="input-email" required type="email" value={form.email} onChange={update('email')} className="form-input" placeholder="maria@example.ru" /></label></div><label className="flex cursor-pointer gap-3 pt-1 text-xs leading-5 text-[#718078]"><input data-testid="checkbox-consent" type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 accent-[#39746a]" required /><span>Согласна на использование этих данных для прохождения симуляции и сохранение анкеты в рабочей базе.</span></label>{error && <div data-testid="status-registration-error" className="rounded-md border border-[#e2b7ac] bg-[#fff1ed] px-3 py-2 text-xs text-[#a2544b]">{error}</div>}<div className="flex items-center justify-between gap-4 pt-3"><button data-testid="button-back-landing" type="button" onClick={() => setLocation('/')} className="button-secondary"><ArrowLeft size={15} /> Назад</button><button data-testid="button-submit-registration" type="submit" disabled={submitting} className="button-primary disabled:cursor-wait disabled:opacity-60">{submitting ? 'Регистрация...' : 'Зарегистрироваться'} {!submitting && <ArrowRight size={15} />}</button></div></form></AuthFrame>;
}

function Instruction() {
  const [, setLocation] = useLocation();
  const name = getProfile().firstName || 'коллега';
  return <AuthFrame step={2}><div className="eyebrow mb-3">перед стартом</div><h2 className="serif text-4xl text-[#294447]">Добро пожаловать,<br /><em>{name}.</em></h2><p className="mt-4 text-sm leading-6 text-[#6e7b75]">Ваш первый день начнется с обычного рабочего утра. Откройте почту, прочитайте вводные, задавайте вопросы и принимайте решения.</p><div className="my-8 grid gap-3 sm:grid-cols-3">{[['45', 'минут'], ['5', 'заданий'], ['4', 'инструмента']].map(([num, text]) => <div key={text} className="rounded-lg border border-[#d6ded5] bg-[#f2f5ee] p-4"><div className="font-mono text-xl text-[#39746a]">{num}</div><div className="mt-1 text-[11px] text-[#78847e]">{text}</div></div>)}</div><div className="border-l-2 border-[#c6a16b] pl-4 text-xs leading-5 text-[#6e7b75]">Используйте Почту, Word, AI-помощника и Мессенджер. В нижней панели можно переключаться между открытыми окнами.</div><div className="mt-9 flex items-center justify-between"><button data-testid="button-back-register" onClick={() => setLocation('/register')} className="button-secondary"><ArrowLeft size={15} /> Назад</button><button data-testid="button-to-demo" onClick={() => setLocation('/demo')} className="button-primary">Посмотреть инструкцию <ArrowRight size={15} /></button></div></AuthFrame>;
}

function Demo() {
  const [, setLocation] = useLocation();
  const [played, setPlayed] = useState(false);
  return <AuthFrame step={3}><div className="eyebrow mb-3">короткая демонстрация</div><h2 className="serif text-4xl text-[#294447]">Так выглядит<br /><em>ваш рабочий день.</em></h2><div className="group relative mt-7 aspect-video overflow-hidden rounded-lg border border-[#bfcfc5] bg-[#2a4549]"><div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_25%,rgba(203,183,133,.32),transparent_28%),linear-gradient(140deg,#466b6e,#263f45)]" /><div className="absolute inset-0 flex flex-col items-center justify-center text-[#f1f3e9]">{played ? <><span className="grid h-14 w-14 place-items-center rounded-full border border-[#e8dbb8]/70 bg-[#f0d39a]/15 text-[#f0d39a]"><Check size={20} /></span><span className="mt-4 font-mono text-[9px] uppercase tracking-[.22em] text-[#b9cec0]">Видео будет добавлено позже</span></> : <button data-testid="button-play-demo" onClick={() => setPlayed(true)} className="grid h-14 w-14 place-items-center rounded-full border border-[#e8dbb8]/70 bg-[#f0d39a]/15 text-[#f0d39a] transition-transform duration-200 group-hover:scale-105" aria-label="Воспроизвести демонстрацию"><Play size={20} fill="currentColor" className="ml-1" /><span className="sr-only">Воспроизвести демонстрацию</span></button>} {!played && <span className="mt-4 font-mono text-[9px] uppercase tracking-[.22em] text-[#b9cec0]">видео-инструкция · 01:48</span>}</div><div className="absolute bottom-3 left-3 right-3 flex items-center justify-between font-mono text-[8px] text-[#c8d6cd]"><span>desktop / getting started</span><span>{played ? 'готово' : '▶ 00:00'}</span></div></div><p className="mt-4 text-xs leading-5 text-[#74817b]">В видео — только навигация по рабочему месту. Содержание решений остается за вами.</p><div className="mt-8 flex items-center justify-between"><button data-testid="button-back-instruction" onClick={() => setLocation('/instruction')} className="button-secondary"><ArrowLeft size={15} /> Назад</button><button data-testid="button-skip-demo" onClick={() => setLocation('/workspace')} className="button-primary">Пропустить и начать <ArrowRight size={15} /></button></div></AuthFrame>;
}

function WindowFrame({ id, title, icon, state, active, onFocus, onClose, onMinimize, onMaximize, children }: { id: AppId; title: string; icon: ReactNode; state: WindowState; active: boolean; onFocus: () => void; onClose: () => void; onMinimize: () => void; onMaximize: () => void; children: ReactNode }) {
  const positions: Record<AppId, React.CSSProperties> = { mail: { left: '9%', top: '8%', width: '82%', height: '78%' }, word: { left: '18%', top: '9%', width: '64%', height: '76%' }, ai: { left: '27%', top: '13%', width: '47%', height: '65%' }, messenger: { left: '30%', top: '16%', width: '43%', height: '59%' } };
  return <section data-testid={`window-${id}`} className={`app-window ${state.maximized ? 'is-max' : ''}`} style={{ ...positions[id], zIndex: state.z, display: state.visible && !state.minimized ? 'flex' : 'none' }} onMouseDown={onFocus}><header className={`app-titlebar ${active ? 'active' : ''}`} onDoubleClick={onMaximize}><div className="app-title">{icon}<span>{title}</span></div><div className="window-controls"><button data-testid={`button-minimize-${id}`} className="window-control" onClick={onMinimize} aria-label="Свернуть"><Minus size={14} /></button><button data-testid={`button-maximize-${id}`} className="window-control" onClick={onMaximize} aria-label="Развернуть"><Square size={12} /></button><button data-testid={`button-close-${id}`} className="window-control close" onClick={onClose} aria-label="Закрыть"><X size={14} /></button></div></header><div className="app-content">{children}</div></section>;
}

function MailApp({ selectedId, setSelectedId, notify, onTaskOpened, taskStatus, onSubmitTask, onTaskExpired }: { selectedId: string; setSelectedId: (id: string) => void; notify: (message: string) => void; onTaskOpened: () => void; taskStatus: TaskStatus; onSubmitTask: () => void; onTaskExpired: () => void }) {
  const [folder, setFolder] = useState('Входящие');
  const [records, setRecords] = useState<MailRecord[]>(() => storage.get<MailRecord[]>('workday-mail-records', getInitialMailRecords()));
  const [drafts, setDrafts] = useState<MailRecord[]>(() => storage.get<MailRecord[]>('workday-mail-drafts', []));
  const [composeOpen, setComposeOpen] = useState(false);
  const [draft, setDraft] = useState({ id: '', to: '', subject: '', body: '' });
  useEffect(() => { storage.set('workday-mail-records', records); }, [records]);
  useEffect(() => { storage.set('workday-mail-drafts', drafts); }, [drafts]);
  const selected = records.find((mail) => mail.id === selectedId) || records[0] || getInitialMailRecords()[0];
  const unreadCount = records.filter((mail) => mail.folder === 'inbox' && !mail.read).length;
  const folderConfig = [
    ['Входящие', Inbox, unreadCount],
    ['Помеченные', Star, ''],
    ['Черновики', PenLine, drafts.length],
    ['Отправленные', Send, ''],
    ['Архив', Archive, ''],
    ['Корзина', Trash2, ''],
  ] as const;
  const openMail = (id: string) => {
    setSelectedId(id);
    setComposeOpen(false);
    const mail = records.find((item) => item.id === id);
    if (mail && !mail.read) {
      setRecords((current) => current.map((item) => item.id === id ? { ...item, read: true, unread: false } : item));
      storage.set('workday-mail-read', [...records.filter((item) => item.read || item.id === id).map((item) => item.id)]);
    }
    if (mail?.id === 'task') onTaskOpened();
  };
  const visibleRecords = folder === 'Входящие'
    ? records.filter((mail) => mail.folder === 'inbox')
    : folder === 'Помеченные'
      ? records.filter((mail) => mail.flagged)
      : folder === 'Отправленные'
        ? records.filter((mail) => mail.folder === 'sent')
        : folder === 'Архив'
          ? records.filter((mail) => mail.folder === 'archive')
          : folder === 'Корзина'
            ? records.filter((mail) => mail.folder === 'trash')
            : [];
  const saveDraft = () => {
    if (!draft.to.trim() && !draft.subject.trim() && !draft.body.trim()) { setComposeOpen(false); return; }
    const saved: MailRecord = { id: draft.id || `draft-${Date.now()}`, sender: 'Вы', email: draft.to, subject: draft.subject || '(без темы)', preview: draft.body.slice(0, 90), date: 'сейчас', unread: false, read: true, flagged: false, folder: 'sent', icon: 'ВЫ' };
    setDrafts((current) => current.some((item) => item.id === saved.id) ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]);
    setComposeOpen(false);
    notify('Черновик сохранен');
  };
  const sendDraft = () => {
    if (!draft.to.trim() || !draft.subject.trim() || !draft.body.trim()) { notify('Заполните получателя, тему и текст'); return; }
    const sent: MailRecord = { id: draft.id || `sent-${Date.now()}`, sender: 'Вы', email: draft.to, subject: draft.subject, preview: draft.body.slice(0, 90), date: 'сейчас', unread: false, read: true, flagged: false, folder: 'sent', icon: 'ВЫ' };
    setRecords((current) => [...current.filter((item) => item.id !== sent.id), sent]);
    setDrafts((current) => current.filter((item) => item.id !== draft.id));
    setComposeOpen(false);
    setFolder('Отправленные');
    setSelectedId(sent.id);
    notify('Письмо отправлено');
  };
  const openDraft = (item: MailRecord) => { setDraft({ id: item.id, to: item.email, subject: item.subject === '(без темы)' ? '' : item.subject, body: item.preview }); setComposeOpen(true); };
  const moveSelected = (folderName: MailFolder) => { setRecords((current) => current.map((item) => item.id === selected.id ? { ...item, folder: folderName } : item)); setFolder(folderName === 'trash' ? 'Корзина' : folderName === 'archive' ? 'Архив' : 'Входящие'); notify(folderName === 'trash' ? 'Письмо перемещено в корзину' : folderName === 'archive' ? 'Письмо архивировано' : 'Письмо возвращено во входящие'); };
  return <div className="mail-layout">
    <aside className="mail-sidebar">
      <button data-testid="button-compose-mail" onClick={() => { setDraft({ id: '', to: '', subject: '', body: '' }); setComposeOpen(true); }} className="mb-4 flex w-full items-center justify-center gap-1.5 rounded-md border border-[#b7cfc2] bg-[#dbeae1] px-2 py-2 text-[10px] font-semibold text-[#2d655d]"><Plus size={13} /> <span className="hidden sm:inline">Написать письмо</span></button>
      {folderConfig.map(([label, Icon, count]) => <button key={label} data-testid={`button-folder-${label}`} onClick={() => { setFolder(label); setComposeOpen(false); }} className={`mail-folder ${folder === label ? 'selected' : ''}`}><Icon size={14} /><span>{label}</span>{count !== '' && Number(count) > 0 && <small className="ml-auto font-mono text-[9px]">{count}</small>}</button>)}
    </aside>
    <div className="mail-list"><div className="mail-list-head"><span>{folder}</span><Search size={14} className="text-[#81918a]" /></div>
      {folder === 'Черновики' ? drafts.map((item) => <button key={item.id} data-testid={`button-draft-${item.id}`} onClick={() => openDraft(item)} className="mail-row"><div className="mail-sender"><span>{item.email || 'Без получателя'}</span><span className="mail-date">{item.date}</span></div><div className="mail-subject">{item.subject}</div><div className="mail-preview">{item.preview}</div></button>) : visibleRecords.map((mail) => <button key={mail.id} data-testid={`button-email-${mail.id}`} onClick={() => openMail(mail.id)} className={`mail-row ${!mail.read ? 'unread' : ''} ${selected.id === mail.id ? 'selected' : ''}`}><div className="mail-sender"><span>{mail.sender}</span><span className="mail-date">{mail.date}</span></div><div className="mail-subject">{mail.flagged && <Star size={11} className="mr-1 inline fill-[#c6a16b] text-[#c6a16b]" />}{mail.subject}</div><div className="mail-preview">{mail.preview}</div></button>)}
      {folder !== 'Черновики' && !visibleRecords.length && <div className="p-5 text-xs text-[#82908a]">В этой папке пока нет писем.</div>}
    </div>
    {composeOpen ? <ComposeMail draft={draft} setDraft={setDraft} onSend={sendDraft} onSave={saveDraft} onCancel={() => setComposeOpen(false)} /> : <EmailReading email={selected} folder={selected.folder} notify={notify} onToggleFlag={() => setRecords((current) => current.map((item) => item.id === selected.id ? { ...item, flagged: !item.flagged } : item))} onMove={moveSelected} onTaskOpened={onTaskOpened} taskStatus={taskStatus} onSubmitTask={onSubmitTask} onTaskExpired={onTaskExpired} />}
  </div>;
}

function ComposeMail({ draft, setDraft, onSend, onSave, onCancel }: { draft: { id: string; to: string; subject: string; body: string }; setDraft: (value: { id: string; to: string; subject: string; body: string }) => void; onSend: () => void; onSave: () => void; onCancel: () => void }) {
  return <form className="reading-pane compose-pane" onSubmit={(event) => { event.preventDefault(); onSend(); }}><div className="eyebrow !text-[9px]">НОВОЕ ПИСЬМО</div><h2 className="mt-3">Написать письмо</h2><label className="field-label mt-6">Кому<input data-testid="input-mail-to" required value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })} className="form-input mt-1" /></label><label className="field-label mt-3">Тема<input data-testid="input-mail-subject" required value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} className="form-input mt-1" /></label><label className="field-label mt-3">Текст<textarea data-testid="textarea-mail-body" required value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} className="form-input mt-1 min-h-[180px]" /></label><div className="mt-5 flex gap-2"><button data-testid="button-send-mail" className="toolbar-button border border-[#b7cfc2] bg-[#dbeae1]" type="submit"><Send size={13} /> Отправить</button><button data-testid="button-save-draft" type="button" onClick={onSave} className="toolbar-button border border-[#d1ddd4]">Сохранить черновик</button><button data-testid="button-cancel-mail" type="button" onClick={onCancel} className="toolbar-button border border-[#d1ddd4]">Отмена</button></div></form>;
}

function EmailReading({ email, folder, notify, onToggleFlag, onMove, onTaskOpened, taskStatus, onSubmitTask, onTaskExpired }: { email: MailRecord; folder: MailFolder; notify: (message: string) => void; onToggleFlag: () => void; onMove: (folder: MailFolder) => void; onTaskOpened: () => void; taskStatus: TaskStatus; onSubmitTask: () => void; onTaskExpired: () => void }) {
  const body = email.id === 'task' ? <><p>Доброе утро!</p><p>Рада, что ты пришел к нам в команду. Присоединяйся к первому проекту.</p><p>Сегодня через час жду тебя на встрече проектной команды, будем обсуждать создание ИИ-помощника для новых сотрудников компании.</p><p>Твоя задача — подготовить и представить свою концепцию помощника, которая поможет новым работникам быстрее адаптироваться и эффективнее решать рабочие задачи.</p><p>Перед встречей продумай свое предложение и подготовь краткое описание концепции. В нем обязательно отрази целевую аудиторию, проблемы и потребности пользователей, ключевые функции, необходимые данные и источники информации, ограничения и риски.</p><p>Через 30 минут напиши, как продвигается работа: все ли получается, есть ли вопросы или сложности. Через час жду тебя на встрече. Свое предложение пришли мне до начала обсуждения.</p><p>С уважением,<br />Марина Орлова<br />Руководитель проектной команды</p></> : email.id === 'survey' ? <><p>Коллеги, собрали результаты короткого опроса новых сотрудников за весенний поток.</p><p>Самые частые сложности в первые дни — найти нужную информацию (42%), понять, к кому обратиться с вопросом (31%) и разобраться с внутренними инструментами (19%). В свободных ответах чаще всего звучала просьба о едином «проводнике» по первым задачам.</p><div className="attachment-card"><FileText size={22} /><div><strong>new_employee_survey.pdf</strong><span>PDF · 2,4 МБ · результаты опроса</span></div><Download size={15} className="ml-auto text-[#668078]" /></div><p>Будем рады, если эти наблюдения пригодятся в твоей концепции.</p></> : email.id === 'data' ? <><p>Олег, привет. Оставляю в одном месте то, что доступно для работы над сегодняшней задачей.</p><h3>Источники</h3><p>• Опрос новых сотрудников — в письме от People team.<br />• Гайд по первым 30 дням — папка «Онбординг».<br />• Анонимизированные обращения в поддержку — таблица за март.</p><p>Не используй персональные данные сотрудников и не выноси внутренние материалы за пределы рабочего пространства.</p></> : email.id === 'security' ? <><p>Несколько важных напоминаний перед началом работы.</p><h3>Рабочие данные</h3><p>Используйте только корпоративное пространство. Не вставляйте имена, адреса и другие персональные данные в публичные AI-сервисы. Перед отправкой файла проверьте права доступа.</p><p>Если сомневаетесь — задайте вопрос IT Security или Марине. Безопасность здесь важнее скорости.</p></> : <><p>Привет!</p><p>{email.preview} Если появятся вопросы, напиши в соответствующий канал — команда на связи.</p><p>Хорошего рабочего дня,<br />Команда Changellenge &gt;&gt;</p></>;
  return <article className="reading-pane"><div className="eyebrow !text-[9px]">{folder === 'inbox' ? 'ВХОДЯЩИЕ' : folder.toUpperCase()} / {email.id === 'task' ? 'ПРИОРИТЕТ' : 'СООБЩЕНИЕ'}</div><div className="flex items-start justify-between gap-3"><h2 className="mt-3">{email.subject}</h2><button data-testid="button-flag-email" onClick={onToggleFlag} className={`toolbar-button mt-2 ${email.flagged ? 'text-[#b18445]' : ''}`} aria-label="Пометить письмо"><Star size={14} className={email.flagged ? 'fill-current' : ''} /></button></div><div className="reading-meta flex items-center gap-2"><span className="person-avatar">{email.icon}</span><span><strong className="text-[#4f615e]">{email.sender}</strong> &lt;{email.email}&gt; · сегодня, {email.date}</span></div><div className="reading-body mt-7">{body}</div>{email.id === 'task' && <TaskForm status={taskStatus} onTaskOpened={onTaskOpened} onSubmitTask={onSubmitTask} onTaskExpired={onTaskExpired} />}{email.folder === 'sent' ? null : <div className="mt-8 flex flex-wrap gap-2">{folder === 'trash' ? <button data-testid="button-restore-email" onClick={() => onMove('inbox')} className="toolbar-button border border-[#d1ddd4]"><RotateCcw size={13} /> Восстановить</button> : <><button data-testid="button-archive-email" onClick={() => onMove('archive')} className="toolbar-button border border-[#d1ddd4]"><Archive size={13} /> Архивировать</button><button data-testid="button-delete-email" onClick={() => onMove('trash')} className="toolbar-button border border-[#d1ddd4] text-[#a26459]"><Trash2 size={13} /> Удалить</button></>}</div>}</article>;
}

function TaskForm({ status, onTaskOpened, onSubmitTask, onTaskExpired }: { status: TaskStatus; onTaskOpened: () => void; onSubmitTask: () => void; onTaskExpired: () => void }) {
  const [checks, setChecks] = useState<Record<string, boolean>>(() => {
    const selected = storage.get<string[]>('task1SelectedActions', []);
    return selected.length ? Object.fromEntries(selected.map((action) => [action, true])) : storage.get('workday-task-checks', {});
  });
  const [orders, setOrders] = useState<Record<string, string>>(() => storage.get('task1Order', storage.get('workday-task-orders', {})));
  const [minutes, setMinutes] = useState<Record<string, string>>(() => storage.get('task1EstimatedTimes', storage.get('workday-task-minutes', {})));
  useEffect(() => { if (status === 'expired') onTaskExpired(); }, [status, onTaskExpired]);
  const updateCheck = (action: string, checked: boolean) => {
    const next = { ...checks, [action]: checked };
    setChecks(next);
    storage.set('task1SelectedActions', Object.keys(next).filter((key) => next[key]));
    storage.set('workday-task-checks', next);
  };
  const updateOrder = (action: string, value: string) => { const next = { ...orders, [action]: value }; setOrders(next); storage.set('task1Order', next); storage.set('workday-task-orders', next); };
  const updateMinutes = (action: string, value: string) => { const next = { ...minutes, [action]: value }; setMinutes(next); storage.set('task1EstimatedTimes', next); storage.set('workday-task-minutes', next); };
  const locked = status !== 'active';
  return <section className="task-inline mt-8 border-t border-[#d8e1d8] pt-6">
    {status === 'completed' && <div className="task-complete-banner"><CheckCircle2 size={16} /> <span><strong>Задание выполнено</strong><small>Ваш ответ отправлен руководителю.</small></span></div>}
    {status === 'expired' && <div className="task-expired-banner"><Info size={16} /> Время на выполнение задания закончилось. Ваш текущий ответ сохранен автоматически.</div>}
    {status === 'not-started' && <div className="task-expired-banner">Откройте письмо, чтобы начать отсчет времени на задание.</div>}
    <div className="task-overline mt-4">ЗАДАНИЕ 1</div>
    <h3 className="mt-2">План работы на 1 час</h3>
    <p className="mt-2 max-w-[700px] text-[11px] leading-5 text-[#61726b]">За ближайшие 7 минут составьте план работы на 1 час по подготовке концепции ИИ-помощника для новичков. Выберите действия, расположите их в нужной последовательности, оцените время и отправьте ответ руководителю.</p>
    <div className="task-table-wrap"><table className="task-table"><thead><tr><th>Действие</th><th>Выбрать</th><th>Последовательность</th><th>Время, мин</th></tr></thead><tbody>{taskActions.map((action, index) => <tr key={action}><td>{action}</td><td><input data-testid={`checkbox-task-action-${index}`} type="checkbox" checked={Boolean(checks[action])} disabled={locked} onChange={(event) => updateCheck(action, event.target.checked)} aria-label={`Выбрать: ${action}`} /></td><td><input data-testid={`input-task-order-${index}`} type="number" min="1" max="20" value={orders[action] || ''} disabled={locked || !checks[action]} onChange={(event) => updateOrder(action, event.target.value)} aria-label={`Последовательность: ${action}`} /></td><td><input data-testid={`input-task-minutes-${index}`} type="number" min="1" max="60" value={minutes[action] || ''} disabled={locked || !checks[action]} onChange={(event) => updateMinutes(action, event.target.value)} aria-label={`Время: ${action}`} /></td></tr>)}</tbody></table></div>
    {!locked && <button data-testid="button-submit-task" type="button" onClick={() => { if (window.confirm('Отправить ответ? После отправки изменить его будет нельзя.')) { storage.set('task1SelectedActions', Object.keys(checks).filter((key) => checks[key])); storage.set('task1Order', orders); storage.set('task1EstimatedTimes', minutes); onSubmitTask(); } }} className="task-submit mt-4">Отправить ответ <Send size={13} className="ml-1 inline" /></button>}
  </section>;
}

function WordApp({ notify }: { notify: (message: string) => void }) {
  const [text, setText] = useState(() => storage.get('workday-word', 'Концепция AI-помощника для новых сотрудников\n\nЦель\nСделать первые дни понятнее: помочь сотруднику быстро найти нужную информацию, понять следующий шаг и обратиться к правильному человеку.\n\nПервые наблюдения\n'));
  const [saved, setSaved] = useState(true);
  useEffect(() => { setSaved(false); const timeout = window.setTimeout(() => { storage.set('workday-word', text); setSaved(true); }, 500); return () => window.clearTimeout(timeout); }, [text]);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return <div className="flex h-full flex-col"><div className="window-toolbar"><button data-testid="button-word-undo" onClick={() => notify('История изменений пока недоступна')} className="toolbar-button"><RotateCcw size={13} /></button><button data-testid="button-word-redo" onClick={() => notify('История изменений пока недоступна')} className="toolbar-button"><ArrowRight size={13} /></button><span className="toolbar-divider" /><button data-testid="button-word-bold" onClick={() => notify('Выделите текст, чтобы применить форматирование')} className="toolbar-button font-bold">B</button><button data-testid="button-word-italic" onClick={() => notify('Выделите текст, чтобы применить форматирование')} className="toolbar-button italic">I</button><button data-testid="button-word-list" onClick={() => setText((value) => `${value}\n• `)} className="toolbar-button">Список</button><span className="toolbar-divider" /><button data-testid="button-word-share" onClick={() => notify('Функция будет доступна в следующей версии')} className="toolbar-button"><UsersRound size={13} /> Поделиться</button><span className="ml-auto text-[10px] text-[#80908a]">{saved ? 'Сохранено локально' : 'Сохранение...'}</span></div><div className="word-wrap"><div className="word-page"><textarea data-testid="textarea-word-document" aria-label="Текст документа" value={text} onChange={(event) => setText(event.target.value)} /></div></div><div className="word-status"><span>Страница 1 из 1</span><span>{words} слов · русский</span></div></div>;
}

type ChatMessage = { id: string; role: 'ai' | 'user'; text: string };
function AiApp() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => storage.get('workday-ai', [{ id: 'welcome', role: 'ai', text: 'Привет. Я помогу разобраться с рабочими материалами и сформулировать первые идеи. С чего начнем?' }]));
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  useEffect(() => { storage.set('workday-ai', messages); }, [messages]);
  const send = () => { const clean = input.trim(); if (!clean || thinking) return; setInput(''); setMessages((current) => [...current, { id: `u-${Date.now()}`, role: 'user', text: clean }]); setThinking(true); window.setTimeout(() => { setMessages((current) => [...current, { id: `a-${Date.now()}`, role: 'ai', text: 'Хорошая мысль. Попробуйте связать ее с конкретным моментом первого дня: где сотрудник теряет время и какая подсказка помогла бы сделать следующий шаг увереннее?' }]); setThinking(false); }, 850); };
  const newDialog = () => setMessages([{ id: `welcome-${Date.now()}`, role: 'ai', text: 'Новый диалог готов. Сформулируйте вопрос по материалам рабочего дня.' }]);
  return <div className="ai-shell"><aside className="ai-sidebar"><button data-testid="button-ai-new-dialog" onClick={newDialog} className="ai-new-dialog"><Plus size={13} /> Новый диалог</button><div className="ai-history-label">История</div><button data-testid="button-ai-history-current" onClick={() => setMessages((current) => current)} className="ai-history-item selected"><Sparkles size={12} /><span>Текущий диалог</span></button><button data-testid="button-ai-history-concept" onClick={newDialog} className="ai-history-item"><FileText size={12} /><span>Концепция помощника</span></button></aside><div className="ai-layout"><div className="ai-head"><span className="ai-orb"><Sparkles size={17} /></span><div><strong className="block text-[12px] text-[#35544f]">AI-помощник</strong><span className="text-[10px] text-[#7d8b83]">внутренний прототип · отвечает по материалам среды</span></div><span className="ml-auto flex items-center gap-1 font-mono text-[9px] text-[#6c9588]"><span className="h-1.5 w-1.5 rounded-full bg-[#6caa88]" /> онлайн</span></div><div className="ai-thread">{messages.map((message) => <div data-testid={`message-ai-${message.id}`} key={message.id} className={`chat-bubble ${message.role}`}>{message.text}</div>)}{thinking && <div className="chat-bubble ai text-[#82928b]">Собираю мысль...</div>}</div><div className="chat-input"><input data-testid="input-ai-message" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') send(); }} placeholder="Напишите вопрос или мысль" /><button data-testid="button-send-ai" onClick={send} className="send-button" aria-label="Отправить"><Send size={14} /></button></div></div></div>;
}

type MessengerMessage = { id: string; chat: string; sender: 'me' | 'them'; text: string };
const people = [{ id: 'marina', name: 'Марина Орлова', initials: 'МО', role: 'руководитель' }, { id: 'oleg', name: 'Олег Власов', initials: 'ОВ', role: 'аналитика' }, { id: 'ekaterina', name: 'Екатерина Соколова', initials: 'ЕС', role: 'People team' }];
function MessengerApp() {
  const [activeChat, setActiveChat] = useState('marina');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<MessengerMessage[]>(() => storage.get('workday-messenger', [{ id: 'm1', chat: 'marina', sender: 'them', text: 'Доброе утро! Если будут вопросы по первой задаче, я на связи.' }, { id: 'm2', chat: 'oleg', sender: 'them', text: 'Привет! Данные по продукту уже в твоей почте.' }, { id: 'm3', chat: 'ekaterina', sender: 'them', text: 'Рада знакомству. Встреча в календаре на 11:30.' }]));
  useEffect(() => { storage.set('workday-messenger', messages); }, [messages]);
  const current = people.find((person) => person.id === activeChat) || people[0];
  const send = () => { const clean = input.trim(); if (!clean) return; setMessages((value) => [...value, { id: `msg-${Date.now()}`, chat: activeChat, sender: 'me', text: clean }]); setInput(''); };
  return <div className="messenger-layout"><aside className="chat-list"><div className="px-2 pb-3 pt-2 font-mono text-[9px] uppercase tracking-widest text-[#89968f]">Чаты</div>{people.map((person) => <button key={person.id} data-testid={`button-chat-${person.id}`} onClick={() => setActiveChat(person.id)} className={`chat-person ${activeChat === person.id ? 'selected' : ''}`}><span className="person-avatar">{person.initials}</span><span className="min-w-0"><strong className="block truncate text-[11px]">{person.name}</strong><small className="block text-[9px] text-[#87958d]">{person.role}</small></span></button>)}</aside><div className="messenger-thread"><div className="messenger-head flex items-center justify-between"><span>{current.name}</span><MoreHorizontal size={15} className="text-[#85918b]" /></div><div className="messenger-messages">{messages.filter((message) => message.chat === activeChat).map((message) => <div data-testid={`message-chat-${message.id}`} key={message.id} className={`message-line ${message.sender === 'me' ? 'self' : ''}`}>{message.text}</div>)}</div><div className="chat-input"><input data-testid="input-messenger-message" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') send(); }} placeholder={`Написать ${current.name.split(' ')[0]}...`} /><button data-testid="button-send-messenger" onClick={send} className="send-button" aria-label="Отправить"><Send size={14} /></button></div></div></div>;
}

function DesktopIcon({ label, icon, onClick }: { label: string; icon: ReactNode; onClick: () => void }) {
  return <button data-testid={`button-desktop-${label}`} onClick={onClick} className="desktop-icon">{icon}<span>{label}</span></button>;
}

function Workspace() {
  const profile = getProfile();
  const [, setLocation] = useLocation();
  const [windows, setWindows] = useState<Record<AppId, WindowState>>({ mail: { visible: false, minimized: false, maximized: false, z: 8 }, word: { visible: false, minimized: false, maximized: false, z: 8 }, ai: { visible: false, minimized: false, maximized: false, z: 8 }, messenger: { visible: false, minimized: false, maximized: false, z: 8 } });
  const [active, setActive] = useState<AppId | null>(null);
  const [selectedMail, setSelectedMail] = useState('task');
  const [welcome, setWelcome] = useState(() => !storage.get('workday-welcome-seen', false));
  const [taskToast, setTaskToast] = useState(false);
  const [launcher, setLauncher] = useState(false);
  const [notice, setNotice] = useState('');
  const [simulationStartedAt] = useState(() => {
    const existing = storage.get<number | null>('simulationStartedAt', null);
    if (existing) return existing;
    const started = Date.now();
    storage.set('simulationStartedAt', started);
    return started;
  });
  const [taskStartedAt, setTaskStartedAt] = useState<number | null>(() => storage.get<number | null>('task1StartedAt', null));
  const [taskStatus, setTaskStatus] = useState<TaskStatus>(() => storage.get<TaskStatus>('task1Status', 'not-started'));
  const [totalSeconds, setTotalSeconds] = useState(() => Math.max(0, Math.ceil((simulationStartedAt + 45 * 60 * 1000 - Date.now()) / 1000)));
  const [taskSeconds, setTaskSeconds] = useState(() => taskStartedAt && taskStatus === 'active' ? Math.max(0, Math.ceil((taskStartedAt + 7 * 60 * 1000 - Date.now()) / 1000)) : 0);
  const [completedTasks, setCompletedTasks] = useState(() => storage.get<number>('completedTasks', taskStatus === 'completed' || taskStatus === 'expired' ? 1 : 0));
  const launcherRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const [now, setNow] = useState(new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const totalRemaining = Math.max(0, Math.ceil((simulationStartedAt + 45 * 60 * 1000 - Date.now()) / 1000));
      setTotalSeconds(totalRemaining);
      if (taskStartedAt && taskStatus === 'active') {
        const taskRemaining = Math.max(0, Math.ceil((taskStartedAt + 7 * 60 * 1000 - Date.now()) / 1000));
        setTaskSeconds(taskRemaining);
        if (taskRemaining === 0) {
          storage.set('task1Status', 'expired');
          storage.set('task1SubmittedAt', null);
          storage.set('completedTasks', 1);
          setTaskStatus('expired');
          setCompletedTasks(1);
          setNotice('Время на задание 1 закончилось');
        }
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [simulationStartedAt, taskStartedAt, taskStatus]);
  useEffect(() => { if (!launcher) return; const onDown = (event: MouseEvent) => { if (!launcherRef.current?.contains(event.target as Node) && !startRef.current?.contains(event.target as Node)) setLauncher(false); }; document.addEventListener('mousedown', onDown); return () => document.removeEventListener('mousedown', onDown); }, [launcher]);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 2700); return () => window.clearTimeout(timer); }, [notice]);
  useEffect(() => { const timer = window.setTimeout(() => setTaskToast(true), 2400); return () => window.clearTimeout(timer); }, []);
  const userInitials = `${profile.firstName?.[0] || 'А'}${profile.lastName?.[0] || 'С'}`.toUpperCase();
  const focus = (id: AppId) => { setActive(id); setWindows((current) => { const highest = Math.max(...Object.values(current).map((value) => value.z), 8); return { ...current, [id]: { ...current[id], visible: true, minimized: false, z: highest + 1 } }; }); };
  const openApp = (id: AppId) => { focus(id); setLauncher(false); };
  const close = (id: AppId) => { setWindows((current) => ({ ...current, [id]: { ...current[id], visible: false, minimized: false } })); if (active === id) setActive(null); };
  const minimize = (id: AppId) => { setWindows((current) => ({ ...current, [id]: { ...current[id], minimized: true } })); };
  const maximize = (id: AppId) => { setWindows((current) => ({ ...current, [id]: { ...current[id], maximized: !current[id].maximized } })); focus(id); };
  const notify = (message: string) => setNotice(message);
  const handleTaskOpened = () => {
    if (taskStartedAt || taskStatus !== 'not-started') return;
    const started = Date.now();
    storage.set('task1StartedAt', started);
    storage.set('task1Status', 'active');
    setTaskStartedAt(started);
    setTaskStatus('active');
    setTaskSeconds(7 * 60);
  };
  const handleTaskSubmitted = () => {
    storage.set('task1SubmittedAt', Date.now());
    storage.set('task1Status', 'completed');
    storage.set('completedTasks', 1);
    setTaskStatus('completed');
    setCompletedTasks(1);
    setTaskSeconds(0);
    notify('Ответ отправлен');
  };
  const handleTaskExpired = () => {
    storage.set('task1Status', 'expired');
    storage.set('completedTasks', 1);
    setTaskStatus('expired');
    setCompletedTasks(1);
    setTaskSeconds(0);
    notify('Время на задание 1 закончилось');
  };
  const openTaskFromToast = () => { setTaskToast(false); focus('mail'); setSelectedMail('task'); handleTaskOpened(); };
  const openCurrentTask = () => { focus('mail'); setSelectedMail('task'); if (taskStatus === 'not-started') handleTaskOpened(); };
  const appIcon = (id: AppId) => id === 'mail' ? <Mail size={14} /> : id === 'word' ? <FileText size={14} /> : id === 'ai' ? <Sparkles size={14} /> : <MessageCircle size={14} />;
  const trayTime = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const trayDate = now.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  const progress = Math.round((completedTasks / 5) * 100);
  return <main className="desktop-stage">
    <div className="desktop-wallpaper" />
    <div className="desktop-topbar"><div className="flex items-center"><span className="mr-5 flex items-center gap-2 text-[#dce8df]"><AppMark small /><span className="hidden font-sans text-[10px] sm:inline">first workday</span></span><div className="metric"><span>ВРЕМЯ</span><strong>{formatTimer(totalSeconds)}</strong></div>{taskStartedAt && taskStatus === 'active' && <div className="metric"><span>ЗАДАНИЕ 1</span><strong>{formatTimer(taskSeconds)}</strong></div>}<div className="metric progress-metric"><span>ВЫПОЛНЕНО {completedTasks} ИЗ 5</span><strong>{progress}%</strong><i><b style={{ width: `${progress}%` }} /></i></div></div><div className="flex items-center gap-3"><span className="hidden text-[#aec2b9] sm:inline">Среда, первый день</span><span className="user-avatar !h-6 !w-6 !bg-[#d19b66] !text-[8px]">{userInitials}</span></div></div>
    <div className="desktop-icons"><DesktopIcon label="Почта" icon={<Mail size={24} />} onClick={() => openApp('mail')} /><DesktopIcon label="Word" icon={<FileText size={24} />} onClick={() => openApp('word')} /><DesktopIcon label="AI-помощник" icon={<Sparkles size={24} />} onClick={() => openApp('ai')} /><DesktopIcon label="Мессенджер" icon={<MessageCircle size={24} />} onClick={() => openApp('messenger')} /></div>
    <button data-testid="button-current-task" onClick={openCurrentTask} className="current-task-chip"><span className="current-task-icon"><CheckCircle2 size={15} /></span><span><small>{completedTasks ? 'Задание 1 выполнено' : 'Текущее задание'}</small><strong>{completedTasks ? '1 из 5 заданий выполнено' : `Задание 1 · ${taskStartedAt ? formatTimer(taskSeconds) : 'Открыть задание'}`}</strong></span><ArrowRight size={14} /></button>
    {(Object.keys(windows) as AppId[]).map((id) => <WindowFrame key={id} id={id} title={appLabels[id]} icon={appIcon(id)} state={windows[id]} active={active === id} onFocus={() => focus(id)} onClose={() => close(id)} onMinimize={() => minimize(id)} onMaximize={() => maximize(id)}>{id === 'mail' && <MailApp selectedId={selectedMail} setSelectedId={setSelectedMail} notify={notify} onTaskOpened={handleTaskOpened} taskStatus={taskStatus} onSubmitTask={handleTaskSubmitted} onTaskExpired={handleTaskExpired} />}{id === 'word' && <WordApp notify={notify} />}{id === 'ai' && <AiApp />}{id === 'messenger' && <MessengerApp />}</WindowFrame>)}
    {taskToast && <div className="task-toast"><button data-testid="button-task-toast" onClick={openTaskFromToast}><span className="toast-kicker">Новое уведомление · 09:12</span><strong>Марина Орлова</strong><span>Первая задача · откройте, чтобы начать</span></button><button data-testid="button-dismiss-task-toast" onClick={() => setTaskToast(false)} className="absolute right-2 top-2 !w-auto !p-1 text-[#adc3b8]" aria-label="Скрыть уведомление"><X size={13} /></button></div>}
    {launcher && <div ref={launcherRef} className="launcher"><div className="launcher-title">Рабочие приложения</div><div className="launcher-grid">{(['mail', 'word', 'ai', 'messenger'] as AppId[]).map((id) => <button data-testid={`button-launcher-${id}`} key={id} onClick={() => openApp(id)} className="launcher-item">{appIcon(id)}{appLabels[id]}</button>)}</div></div>}
    {notice && <div data-testid="status-workspace-notice" className="animate-toast absolute bottom-[65px] left-1/2 z-[45] -translate-x-1/2 rounded-md border border-[#d6e5d9] bg-[#f0f6ef] px-4 py-2 text-[11px] font-semibold text-[#39746a] shadow-lg">{notice}</div>}
    <div className="desktop-taskbar"><div className="taskbar-center"><button ref={startRef} data-testid="button-start-menu" onClick={() => setLauncher((value) => !value)} className={`taskbar-button taskbar-start ${launcher ? 'active' : ''}`} aria-label="Открыть меню приложений"><LayoutGrid size={19} /></button>{(['mail', 'word', 'ai', 'messenger'] as AppId[]).map((id) => <button data-testid={`button-taskbar-${id}`} key={id} onClick={() => { if (windows[id].visible && !windows[id].minimized && active === id) minimize(id); else openApp(id); }} className={`taskbar-button ${windows[id].visible && !windows[id].minimized ? 'active' : ''}`}><span className="hidden sm:inline">{appIcon(id)}</span><span>{appLabels[id]}</span></button>)}</div><div className="system-tray"><Wifi size={13} /><Bell size={13} /><div className="system-time"><div>{trayTime}</div><div>{trayDate}.{now.getFullYear()}</div></div></div></div>
    {welcome && <div className="welcome-backdrop"><div className="welcome-card"><div className="mark"><BriefcaseBusiness size={21} /></div><div className="eyebrow !text-[#71817a]">добро пожаловать в рабочую среду</div><h2 className="mt-3">Первый день начинается.</h2><p>Здесь уже открыты нужные инструменты. Начните с письма от Марины или откройте уведомление в правом нижнем углу.</p><button data-testid="button-close-welcome" onClick={() => { storage.set('workday-welcome-seen', true); setWelcome(false); }} className="button-primary w-full">Понятно, начать работу <ArrowRight size={15} /></button></div></div>}
    <div className="mobile-warning"><div className="mobile-warning-card"><MonitorIcon /><h2>Рабочее место требует экрана шире.</h2><p>Симуляция собрана как desktop-first среда. Откройте ее на экране шириной от 1100 px, чтобы все окна и панели были доступны.</p><button data-testid="button-mobile-back" onClick={() => setLocation('/instruction')} className="button-secondary mt-4 !border-[#76968c] !text-[#e6eee8]">Вернуться к инструкции</button></div></div>
  </main>;
}

function MonitorIcon() {
  return <div className="mx-auto mb-5 grid h-12 w-16 place-items-center rounded-md border-2 border-[#c9ddd1] text-[#c9ddd1]"><span className="h-1 w-6 rounded-full bg-[#c9ddd1]" /></div>;
}

function NotFound() {
  const [, setLocation] = useLocation();
  return <main className="landing-shell flex min-h-[100dvh] items-center justify-center px-6"><div className="text-center"><div className="eyebrow mb-4">ошибка 404</div><h1 className="serif text-6xl text-[#294447]">Страница ушла<br /><em>на обед.</em></h1><button data-testid="button-not-found-home" onClick={() => setLocation('/')} className="button-primary mt-8">Вернуться на старт <ArrowLeft size={15} /></button></div></main>;
}

function Router() {
  return <Switch><Route path="/" component={Landing} /><Route path="/register" component={Register} /><Route path="/instruction" component={Instruction} /><Route path="/demo" component={Demo} /><Route path="/workspace" component={Workspace} /><Route component={NotFound} /></Switch>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><ErrorBoundary resetKey={window.location.pathname}><Router /></ErrorBoundary></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;