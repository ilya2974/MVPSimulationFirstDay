/** One durable entry per event: tabs cannot overwrite each other's queues. */
const prefix = 'event-outbox:';
type Event = { id: string; participantId: string; eventType: string; payload: Record<string, unknown>; createdAt: string };
const memory = new Map<string, Event>();
let sending = false;

function pending(): Event[] {
  const entries = new Map(memory);
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        try { const event = JSON.parse(localStorage.getItem(key)!); entries.set(event.id, event); } catch { /* Ignore damaged entries. */ }
      }
    }
  } catch { /* The in-memory queue still works when storage is unavailable. */ }
  return [...entries.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function flushEvents() {
  if (sending) return;
  sending = true;
  try {
    for (const event of pending()) {
      try {
        const response = await fetch(`/api/events/${event.participantId}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event), signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        memory.delete(event.id);
        try { localStorage.removeItem(prefix + event.id); } catch { /* Retry is idempotent. */ }
      } catch (error) {
        console.error('Simulation event delivery pending; will retry', event.id, error);
        if (!(error instanceof Error && /HTTP 4\d\d/.test(error.message))) break;
      }
    }
  } finally { sending = false; }
}

export function trackEvent(eventType: string, payload: Record<string, unknown> = {}) {
  try {
    const participantId = JSON.parse(localStorage.getItem('workday-profile') ?? 'null')?.participantId;
    if (!participantId) return;
    const event: Event = { id: crypto.randomUUID(), participantId, eventType, payload: { ...payload, path: location.pathname }, createdAt: new Date().toISOString() };
    memory.set(event.id, event);
    try { localStorage.setItem(prefix + event.id, JSON.stringify(event)); }
    catch (error) { console.error('Event queue cannot be persisted; keep this tab open until sync completes', error); }
    void flushEvents();
  } catch (error) { console.error('Could not record simulation event', error); }
}

export function trackStateChange(key: string, value: unknown, previous: string | null) {
  // Keep chat messages individually, rather than copying the entire growing history.
  if ((key === 'workday-ai' || key === 'workday-messenger') && Array.isArray(value)) {
    let old: { id: string }[] = [];
    try { old = JSON.parse(previous ?? '[]'); } catch { /* First snapshot. */ }
    const known = new Set(old.map((message) => message.id));
    for (const message of value) {
      if (!known.has(message.id)) {
        const app = key === 'workday-ai' ? 'ai' : 'messenger';
        const direction = message.role === 'user' || message.sender === 'me' ? 'sent' : 'received';
        trackEvent(`${app}_message_${direction}`, { message });
      }
    }
    return;
  }
  let type = 'state_changed';
  if (key === 'simulationStartedAt') type = 'simulation_started';
  else if (key === 'simulationFinished' && value === true) type = 'simulation_finished';
  else if (/^task\d+Status$/.test(key)) type = `task_${value}`;
  else if (/SurveyAnswers$/.test(key)) type = 'survey_answered';
  else if (/SurveyCompleted$/.test(key)) type = 'survey_completed';
  else if (key === 'workday-mail-records') type = 'mail_updated';
  else if (key === 'workday-messenger') type = 'messenger_updated';
  else if (key === 'workday-task-files') type = 'files_updated';
  trackEvent(type, { key, value });
}

export function startEventTracking() {
  const click = (event: MouseEvent) => {
    const element = event.target instanceof Element ? event.target.closest('button, a, [role="button"]') : null;
    if (element) trackEvent('ui_clicked', { target: element.getAttribute('data-testid') ?? element.getAttribute('aria-label') ?? element.textContent?.trim().slice(0, 120), disabled: element.hasAttribute('disabled') });
  };
  const change = (event: globalThis.Event) => {
    const element = event.target;
    if (location.pathname.endsWith('/workspace') && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) {
      trackEvent('input_changed', { target: element.getAttribute('data-testid') ?? element.name ?? element.id, value: element.value, ...(element instanceof HTMLInputElement && ['checkbox', 'radio'].includes(element.type) ? { checked: element.checked } : {}) });
    }
  };
  const visibility = () => { trackEvent('visibility_changed', { state: document.visibilityState }); };
  const online = () => { void flushEvents(); };
  const timer = window.setInterval(online, 5000);
  document.addEventListener('click', click, true);
  document.addEventListener('change', change, true);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('online', online);
  online();
  return () => { clearInterval(timer); document.removeEventListener('click', click, true); document.removeEventListener('change', change, true); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('online', online); };
}

