import assert from 'node:assert/strict';
import { test } from 'node:test';

// Exercise the real browser queue with storage and transport replacements.
test('event queue survives failed delivery and retries the original IDs and timestamps', async () => {
  const data = new Map<string, string>();
  const storage = {
    get length() { return data.size; },
    key: (index: number) => [...data.keys()][index] ?? null,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  Object.defineProperty(globalThis, 'location', { value: { pathname: '/workspace' }, configurable: true });
  const participantId = crypto.randomUUID();
  storage.setItem('workday-profile', JSON.stringify({ participantId }));
  const queue = await import('../../workday-simulation/src/lib/simulation-events.ts');
  const sent: any[] = [];
  let offline = true;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    const event = JSON.parse(options!.body as string);
    sent.push(event);
    if (offline) throw new Error('test network failure');
    return new Response(JSON.stringify({ ok: true }), { status: 201 });
  };
  try {
    queue.trackEvent('mail_opened', { mailId: 'mail-1' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal([...data.keys()].filter((key) => key.startsWith('event-outbox:')).length, 1);
    const original = sent[0];
    // An entry from another tab or an earlier page load must also be sent.
    const persisted = { ...original, id: crypto.randomUUID(), eventType: 'simulation_finished' };
    storage.setItem('event-outbox:' + persisted.id, JSON.stringify(persisted));
    offline = false;
    await queue.flushEvents();
    assert.deepEqual(sent[1], original);
    assert.equal(sent[2].id, persisted.id);
    assert.equal([...data.keys()].filter((key) => key.startsWith('event-outbox:')).length, 0);
    const message = { id: 'message-1', role: 'user', text: 'Hello' };
    queue.trackStateChange('workday-ai', [message], '[]');
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(sent.at(-1).eventType, 'ai_message_sent');
    const count = sent.length;
    queue.trackStateChange('workday-ai', [message], JSON.stringify([message]));
    await queue.flushEvents();
    assert.equal(sent.length, count, 'existing history must not be emitted again');
    assert.equal(sent.at(-1).participantId, participantId);
  } finally { globalThis.fetch = originalFetch; }
});
